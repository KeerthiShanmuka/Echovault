import asyncio
import logging
import re
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.config import settings
from app.models.schemas import (
    AgentStepEvent,
    MemoryCitation,
    MemoryItem,
    StepStatus,
    TaskItem,
    WorkflowError,
    WorkflowExecution,
    utcnow
)
from app.services.embedding_service import embedding_service
from app.services.lyzr_service import extract_json_object, lyzr_service
from app.services.qdrant_service import qdrant_service
from app.services.storage import storage

logger = logging.getLogger("echovault.orchestrator")


class AgentOrchestrator:
    # -------------------------------------------------------------------------
    # TRANSCRIPT INGESTION WORKFLOW
    # -------------------------------------------------------------------------
    async def process_transcript(
        self,
        transcript: str,
        title: Optional[str] = None,
        source: str = "manual",
        user_id: str = settings.DEFAULT_USER_ID,
        execution_id: Optional[str] = None,
        correlation_id: Optional[str] = None
    ) -> WorkflowExecution:
        exec_id = execution_id or f"exec-{uuid.uuid4().hex[:12]}"
        corr_id = correlation_id or f"corr-{uuid.uuid4().hex[:12]}"
        
        # Initial workflow execution object
        execution = WorkflowExecution(
            execution_id=exec_id,
            correlation_id=corr_id,
            user_id=user_id,
            workflow_type="transcript_ingestion",
            status="running",
            label=title or f"Transcript ({len(transcript.split())} words)",
            start_time=utcnow(),
            steps=[
                AgentStepEvent(key="voice_input", agent_name="Voice / Text Ingestion", role="Speech Capture & Validation", status="completed", finished_at=utcnow(), duration_ms=10, input_preview=f"Source: {source.upper()} ({len(transcript)} chars)", output_preview=f"Validated transcript: {len(transcript.split())} words"),
                AgentStepEvent(key="transcript_processing", agent_name="Transcript Processor", role="Sanitization & Structuring", status="completed", finished_at=utcnow(), duration_ms=15, input_preview="Raw transcript text", output_preview="Payload sanitized for multi-agent dispatch"),
                AgentStepEvent(key="manager", agent_name="Manager Agent", role="Routing & Work Allocation", is_lyzr_agent=True, status="waiting"),
                AgentStepEvent(key="summarizer", agent_name="Summarizer Agent", role="Dialogue Synthesis & Facts", is_lyzr_agent=True, status="waiting"),
                AgentStepEvent(key="task_extractor", agent_name="Task Extractor Agent", role="Action Items & Deadlines", is_lyzr_agent=True, status="waiting"),
                AgentStepEvent(key="qdrant_memory", agent_name="Qdrant Vector Pipeline", role="Dense Embedding & Indexing", status="waiting"),
                AgentStepEvent(key="final_response", agent_name="Final Response Dispatch", role="Persistence & UI Sync", status="waiting")
            ]
        )
        storage.save_execution(execution)
        start_overall = time.perf_counter()

        def update_step(key: str, status: StepStatus, input_p: Optional[str] = None, output_p: Optional[str] = None, err: Optional[str] = None, dur: Optional[int] = None):
            for s in execution.steps:
                if s.key == key:
                    s.status = status
                    if input_p is not None: s.input_preview = input_p
                    if output_p is not None: s.output_preview = output_p
                    if err is not None: s.error_message = err
                    if dur is not None: s.duration_ms = dur
                    if status == "running": s.started_at = utcnow()
                    elif status in ("completed", "failed", "skipped"): s.finished_at = utcnow()
                    break
            storage.save_execution(execution)

        try:
            # 1. Manager Agent routing
            update_step("manager", "running", input_p=f"Routing analysis for transcript ({len(transcript.split())} words)")
            m_session = f"mgr-{corr_id}"
            m_prompt = (
                "ROUTING DECISION ONLY. The EchoVault backend coordinates worker execution.\n"
                "Decide which worker agents are needed for this transcript ingestion.\n"
                "Reply with ONLY valid JSON: {\"run_summarizer\": true, \"run_task_extractor\": true, \"reason\": \"<short reason>\"}\n\n"
                f"Transcript preview: {transcript[:500]}"
            )
            m_res = await lyzr_service.call_agent("manager", m_prompt, m_session, user_id)
            if not m_res.ok:
                update_step("manager", "failed", err=m_res.error_message, dur=m_res.duration_ms)
                execution.status = "failed"
                execution.error = WorkflowError(code=m_res.error_code or "manager_failed", message=f"Manager Agent failed: {m_res.error_message}", step_key="manager")
                execution.end_time = utcnow()
                execution.total_duration_ms = int((time.perf_counter() - start_overall) * 1000)
                storage.save_execution(execution)
                return execution

            m_json = extract_json_object(m_res.text) or {}
            run_sum = m_json.get("run_summarizer", True)
            run_tsk = m_json.get("run_task_extractor", True)
            reason = m_json.get("reason", "Standard transcript analysis required.")
            update_step("manager", "completed", output_p=f"Decision: Summarizer={run_sum}, Tasks={run_tsk}. Reason: {reason}", dur=m_res.duration_ms)

            # 2. Summarizer & Task Extractor in parallel (bounded concurrency)
            sum_task_coro = None
            if run_sum:
                update_step("summarizer", "running", input_p=f"Generating executive summary for dialogue ({len(transcript.split())} words)")
                s_session = f"sum-{corr_id}"
                s_prompt = (
                    "Summarize this conversation transcript.\n"
                    "Output format is mandatory: reply with ONLY a JSON object: "
                    "{\"title\": \"<short concise title max 8 words>\", \"summary\": \"<2-4 sentence summary>\", "
                    "\"topics\": [\"<topic>\", ...], \"facts\": [\"<fact>\", ...], \"people\": [\"<name>\", ...]}\n\n"
                    f"Transcript:\n{transcript}"
                )
                sum_task_coro = lyzr_service.call_agent("summarizer", s_prompt, s_session, user_id)
            else:
                update_step("summarizer", "skipped", output_p="Skipped by Manager Agent decision")

            tsk_task_coro = None
            if run_tsk:
                update_step("task_extractor", "running", input_p="Parsing transcript for commitments, owners, and deadlines")
                t_session = f"tsk-{corr_id}"
                t_prompt = (
                    "Extract actionable tasks and deadlines from this transcript.\n"
                    "Output format is mandatory: reply with ONLY valid JSON: "
                    "{\"tasks\": [{\"title\": \"<action>\", \"owner\": \"<name or null>\", \"deadline\": \"<date or null>\", \"priority\": \"low|medium|high\"}]}\n\n"
                    f"Transcript:\n{transcript}"
                )
                tsk_task_coro = lyzr_service.call_agent("task_extractor", t_prompt, t_session, user_id)
            else:
                update_step("task_extractor", "skipped", output_p="Skipped by Manager Agent decision")

            # Await workers
            sum_res = await sum_task_coro if sum_task_coro else None
            tsk_res = await tsk_task_coro if tsk_task_coro else None

            # Process Summarizer result
            resolved_title = title or "Voice Conversation"
            resolved_summary = ""
            resolved_topics: List[str] = []
            resolved_facts: List[str] = []
            resolved_people: List[str] = []

            if sum_res is not None:
                if not sum_res.ok:
                    update_step("summarizer", "failed", err=sum_res.error_message, dur=sum_res.duration_ms)
                    execution.status = "failed"
                    execution.error = WorkflowError(code=sum_res.error_code or "summarizer_failed", message=f"Summarizer Agent failed: {sum_res.error_message}", step_key="summarizer")
                    execution.end_time = utcnow()
                    execution.total_duration_ms = int((time.perf_counter() - start_overall) * 1000)
                    storage.save_execution(execution)
                    return execution

                s_json = extract_json_object(sum_res.text)
                if s_json:
                    if not title and s_json.get("title"):
                        resolved_title = str(s_json["title"]).strip()
                    resolved_summary = str(s_json.get("summary", "")).strip()
                    resolved_topics = [str(x).strip() for x in s_json.get("topics", []) if str(x).strip()]
                    resolved_facts = [str(x).strip() for x in s_json.get("facts", []) if str(x).strip()]
                    resolved_people = [str(x).strip() for x in s_json.get("people", []) if str(x).strip()]
                else:
                    resolved_summary = sum_res.text.strip()
                    resolved_topics = ["Conversation"]
                update_step("summarizer", "completed", output_p=f"Summary: {resolved_summary[:140]}... ({len(resolved_facts)} facts, {len(resolved_topics)} topics)", dur=sum_res.duration_ms)

            # Process Task Extractor result
            extracted_task_items: List[TaskItem] = []
            memory_id = str(uuid.uuid4())
            conv_id = str(uuid.uuid4())

            if tsk_res is not None:
                if not tsk_res.ok:
                    update_step("task_extractor", "failed", err=tsk_res.error_message, dur=tsk_res.duration_ms)
                    execution.status = "failed"
                    execution.error = WorkflowError(code=tsk_res.error_code or "task_extractor_failed", message=f"Task Extractor Agent failed: {tsk_res.error_message}", step_key="task_extractor")
                    execution.end_time = utcnow()
                    execution.total_duration_ms = int((time.perf_counter() - start_overall) * 1000)
                    storage.save_execution(execution)
                    return execution

                t_json = extract_json_object(tsk_res.text)
                raw_tasks = (t_json.get("tasks") if t_json else None) or []
                for rt in raw_tasks:
                    if isinstance(rt, dict) and rt.get("title"):
                        prio = str(rt.get("priority", "medium")).lower()
                        if prio not in ("low", "medium", "high"): prio = "medium"
                        t_obj = TaskItem(
                            user_id=user_id,
                            memory_id=memory_id,
                            conversation_id=conv_id,
                            title=str(rt["title"]).strip(),
                            deadline=str(rt["deadline"]).strip() if rt.get("deadline") else None,
                            priority=prio,
                            assigned_owner=str(rt["owner"]).strip() if rt.get("owner") else None,
                            extracted=rt
                        )
                        extracted_task_items.append(t_obj)
                update_step("task_extractor", "completed", output_p=f"Extracted {len(extracted_task_items)} action items", dur=tsk_res.duration_ms)

            # 3. Embedding generation and Qdrant storage
            update_step("qdrant_memory", "running", input_p=f"Computing dense vector ({settings.EMBEDDING_DIMENSION} dims)")
            t_embed_start = time.perf_counter()
            content_to_embed = f"Title: {resolved_title}\nSummary: {resolved_summary}\nTranscript: {transcript}"
            try:
                vector = await embedding_service.embed(content_to_embed)
            except Exception as e:
                dur_e = int((time.perf_counter() - t_embed_start) * 1000)
                update_step("qdrant_memory", "failed", err=f"Embedding error: {str(e)}", dur=dur_e)
                execution.status = "failed"
                execution.error = WorkflowError(code="embedding_failed", message=f"Embedding failed: {str(e)}", step_key="qdrant_memory")
                execution.end_time = utcnow()
                execution.total_duration_ms = int((time.perf_counter() - start_overall) * 1000)
                storage.save_execution(execution)
                return execution

            # Store memory in Qdrant
            qdrant_payload = {
                "memory_id": memory_id,
                "user_id": user_id,
                "conversation_id": conv_id,
                "title": resolved_title,
                "source": source,
                "timestamp": utcnow(),
                "summary": resolved_summary,
                "topics": resolved_topics,
                "facts": resolved_facts,
                "transcript": transcript[:4000]
            }
            try:
                await qdrant_service.upsert_memory(memory_id, vector, qdrant_payload)
                dur_q = int((time.perf_counter() - t_embed_start) * 1000)
                update_step("qdrant_memory", "completed", output_p=f"Upserted point {memory_id[:8]} into Qdrant collection '{settings.QDRANT_COLLECTION}'", dur=dur_q)
            except Exception as e:
                dur_q = int((time.perf_counter() - t_embed_start) * 1000)
                update_step("qdrant_memory", "failed", err=f"Qdrant storage failed: {str(e)}", dur=dur_q)
                execution.status = "failed"
                execution.error = WorkflowError(code="qdrant_failed", message=f"Qdrant storage failed: {str(e)}", step_key="qdrant_memory")
                execution.end_time = utcnow()
                execution.total_duration_ms = int((time.perf_counter() - start_overall) * 1000)
                storage.save_execution(execution)
                return execution

            # 4. Final local persistence and response packaging
            update_step("final_response", "running", input_p="Saving structured record and tasks to local state")
            new_memory = MemoryItem(
                id=memory_id,
                user_id=user_id,
                conversation_id=conv_id,
                title=resolved_title,
                source=source,
                timestamp=utcnow(),
                transcript=transcript,
                summary=resolved_summary,
                topics=resolved_topics,
                facts=resolved_facts,
                people=resolved_people,
                task_ids=[t.id for t in extracted_task_items],
                correlation_id=corr_id
            )
            storage.save_memory(new_memory)
            if extracted_task_items:
                storage.save_tasks(extracted_task_items)

            update_step("final_response", "completed", output_p=f"Memory saved: '{resolved_title}', {len(extracted_task_items)} tasks synced", dur=10)

            execution.status = "completed"
            execution.label = resolved_title
            execution.end_time = utcnow()
            execution.total_duration_ms = int((time.perf_counter() - start_overall) * 1000)
            execution.result = {
                "memory_id": memory_id,
                "conversation_id": conv_id,
                "title": resolved_title,
                "summary": resolved_summary,
                "tasks_count": len(extracted_task_items)
            }
            storage.save_execution(execution)
            return execution

        except Exception as e:
            logger.exception("Unexpected workflow failure")
            execution.status = "failed"
            execution.error = WorkflowError(code="unexpected_error", message=f"Internal workflow error: {str(e)}")
            execution.end_time = utcnow()
            execution.total_duration_ms = int((time.perf_counter() - start_overall) * 1000)
            storage.save_execution(execution)
            return execution

    # -------------------------------------------------------------------------
    # CHAT / QUERY WORKFLOW (RAG)
    # -------------------------------------------------------------------------
    async def answer_chat_query(
        self,
        query: str,
        user_id: str = settings.DEFAULT_USER_ID,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        corr_id = f"corr-{uuid.uuid4().hex[:12]}"
        exec_id = f"exec-{uuid.uuid4().hex[:12]}"
        start_overall = time.perf_counter()

        execution = WorkflowExecution(
            execution_id=exec_id,
            correlation_id=corr_id,
            user_id=user_id,
            workflow_type="chat_query",
            status="running",
            label=f"Query: {query[:45]}...",
            start_time=utcnow(),
            steps=[
                AgentStepEvent(key="query_validation", agent_name="Query Input Validator", role="Input Check & Sanitization", status="completed", finished_at=utcnow(), duration_ms=5, input_preview=query, output_preview="Valid query"),
                AgentStepEvent(key="qdrant_retrieval", agent_name="Qdrant Vector Retrieval", role="Semantic Similarity Search", status="waiting"),
                AgentStepEvent(key="memory_assistant", agent_name="Memory Assistant Agent", role="RAG Synthesis & Grounding", is_lyzr_agent=True, status="waiting"),
                AgentStepEvent(key="final_response", agent_name="Answer Delivery", role="Format Verification & Citations", status="waiting")
            ]
        )
        storage.save_execution(execution)

        def update_step(key: str, status: StepStatus, input_p: Optional[str] = None, output_p: Optional[str] = None, err: Optional[str] = None, dur: Optional[int] = None):
            for s in execution.steps:
                if s.key == key:
                    s.status = status
                    if input_p is not None: s.input_preview = input_p
                    if output_p is not None: s.output_preview = output_p
                    if err is not None: s.error_message = err
                    if dur is not None: s.duration_ms = dur
                    if status == "running": s.started_at = utcnow()
                    elif status in ("completed", "failed", "skipped"): s.finished_at = utcnow()
                    break
            storage.save_execution(execution)

        try:
            # 1. Qdrant Retrieval
            update_step("qdrant_retrieval", "running", input_p=f"Query embedding & search: '{query}'")
            t_ret_start = time.perf_counter()
            try:
                query_vec = await embedding_service.embed(query)
                hits = await qdrant_service.search(query_vec, user_id=user_id, limit=settings.MAX_SEARCH_RESULTS, threshold=settings.RETRIEVAL_SCORE_THRESHOLD)
            except Exception as e:
                dur_r = int((time.perf_counter() - t_ret_start) * 1000)
                update_step("qdrant_retrieval", "failed", err=str(e), dur=dur_r)
                execution.status = "failed"
                execution.error = WorkflowError(code="retrieval_failed", message=f"Vector search failed: {str(e)}", step_key="qdrant_retrieval")
                execution.end_time = utcnow()
                execution.total_duration_ms = int((time.perf_counter() - start_overall) * 1000)
                storage.save_execution(execution)
                raise

            citations: List[MemoryCitation] = []
            for score, payload in hits:
                excerpt = payload.get("summary") or payload.get("transcript", "")
                if len(excerpt) > 280: excerpt = excerpt[:280] + "..."
                citations.append(MemoryCitation(
                    memory_id=str(payload.get("memory_id", "")),
                    conversation_id=str(payload.get("conversation_id", "")),
                    title=str(payload.get("title", "Voice Memory")),
                    timestamp=str(payload.get("timestamp", "")),
                    source=str(payload.get("source", "manual")),
                    excerpt=excerpt,
                    similarity_score=round(score, 3)
                ))

            dur_r = int((time.perf_counter() - t_ret_start) * 1000)
            if citations:
                update_step("qdrant_retrieval", "completed", output_p=f"Retrieved {len(citations)} relevant memories (Top score: {citations[0].similarity_score:.0%})", dur=dur_r)
            else:
                update_step("qdrant_retrieval", "completed", output_p="No memories exceeded similarity threshold", dur=dur_r)

            # 2. Memory Assistant Agent invocation
            if not citations:
                update_step("memory_assistant", "skipped", output_p="Skipped because no relevant memories were found")
                update_step("final_response", "completed", output_p="Returned no-match explanation", dur=5)
                answer = "I couldn't find any relevant saved voice conversations matching your question. Try rephrasing or ingest a new conversation."
                execution.status = "completed"
                execution.end_time = utcnow()
                execution.total_duration_ms = int((time.perf_counter() - start_overall) * 1000)
                execution.result = {"answer": answer, "citations_count": 0, "no_match": True}
                storage.save_execution(execution)
                return {
                    "answer": answer,
                    "citations": [],
                    "execution": execution,
                    "correlation_id": corr_id,
                    "no_match": True
                }

            update_step("memory_assistant", "running", input_p=f"Providing {len(citations)} citations to Memory Assistant Agent")
            context_blocks = []
            for i, c in enumerate(citations[:4], 1):
                context_blocks.append(f"Memory {i} [{c.title} - {c.timestamp}]:\n{c.excerpt}")
            full_context = "\n\n".join(context_blocks)

            agent_prompt = (
                f"You are the EchoVault Memory Assistant.\n"
                f"Answer the user's question accurately using ONLY the retrieved memories below.\n"
                f"Cite the relevant conversation title when stating facts.\n\n"
                f"RELEVANT MEMORIES:\n{full_context}\n\n"
                f"USER QUESTION: {query}"
            )
            chat_session = session_id or f"chat-{corr_id}"
            a_res = await lyzr_service.call_agent("memory_assistant", agent_prompt, chat_session, user_id)
            if not a_res.ok:
                update_step("memory_assistant", "failed", err=a_res.error_message, dur=a_res.duration_ms)
                execution.status = "failed"
                execution.error = WorkflowError(code=a_res.error_code or "agent_failed", message=f"Memory Assistant Agent failed: {a_res.error_message}", step_key="memory_assistant")
                execution.end_time = utcnow()
                execution.total_duration_ms = int((time.perf_counter() - start_overall) * 1000)
                storage.save_execution(execution)
                raise RuntimeError(f"Memory Assistant Agent error: {a_res.error_message}")

            update_step("memory_assistant", "completed", output_p=f"Generated answer ({len(a_res.text.split())} words)", dur=a_res.duration_ms)
            update_step("final_response", "completed", output_p=f"Delivered answer with {len(citations)} grounded citations", dur=10)

            execution.status = "completed"
            execution.end_time = utcnow()
            execution.total_duration_ms = int((time.perf_counter() - start_overall) * 1000)
            execution.result = {"answer": a_res.text, "citations_count": len(citations)}
            storage.save_execution(execution)

            return {
                "answer": a_res.text,
                "citations": citations,
                "execution": execution,
                "correlation_id": corr_id,
                "no_match": False
            }

        except Exception as e:
            if execution.status != "failed":
                execution.status = "failed"
                execution.error = WorkflowError(code="query_failed", message=str(e))
                execution.end_time = utcnow()
                execution.total_duration_ms = int((time.perf_counter() - start_overall) * 1000)
                storage.save_execution(execution)
            raise


agent_orchestrator = AgentOrchestrator()
