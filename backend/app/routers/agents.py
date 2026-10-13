from typing import List
from fastapi import APIRouter, HTTPException

from app.config import settings
from app.models.schemas import AgentInfo, WorkflowExecution
from app.services.lyzr_service import lyzr_service
from app.services.storage import storage

router = APIRouter(prefix="/api/agents", tags=["Agents"])

MANIFEST = [
    {"key": "manager", "name": "Manager Agent", "role": "Routing & Delegation Orchestrator"},
    {"key": "summarizer", "name": "Summarizer Agent", "role": "Dialogue Synthesis & Factual Extraction"},
    {"key": "task_extractor", "name": "Task Extractor Agent", "role": "Action Item & Deadline Parser"},
    {"key": "memory_assistant", "name": "Memory Assistant Agent", "role": "Semantic RAG Grounding & Reasoning"}
]


@router.get("", response_model=List[AgentInfo])
def list_agents():
    execs = storage.list_executions(settings.DEFAULT_USER_ID, limit=100)
    agent_info_list: List[AgentInfo] = []

    for item in MANIFEST:
        key = item["key"]
        configured = lyzr_service.is_agent_configured(key)
        runs = 0
        durations = []
        last_status = None
        last_run_at = None
        last_error = None

        for ex in execs:
            for s in ex.steps:
                if s.key == key:
                    runs += 1
                    if s.duration_ms: durations.append(s.duration_ms)
                    if not last_status:
                        last_status = s.status
                        last_run_at = s.finished_at or s.started_at
                        last_error = s.error_message

        avg_dur = int(sum(durations) / len(durations)) if durations else None

        agent_info_list.append(AgentInfo(
            key=key,
            name=item["name"],
            role=item["role"],
            configured=configured,
            runs=runs,
            last_status=last_status,
            last_run_at=last_run_at,
            last_error=last_error,
            avg_duration_ms=avg_dur
        ))

    return agent_info_list


@router.get("/activity", response_model=List[WorkflowExecution])
def list_activity(limit: int = 50):
    return storage.list_executions(settings.DEFAULT_USER_ID, limit=limit)


@router.get("/activity/{execution_id}", response_model=WorkflowExecution)
def get_execution_detail(execution_id: str):
    ex = storage.get_execution(settings.DEFAULT_USER_ID, execution_id)
    if not ex:
        raise HTTPException(status_code=404, detail="Execution not found.")
    return ex
