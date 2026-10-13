import asyncio
import logging
import uuid
from typing import Any, Dict, List, Optional

from app.config import settings
from app.services.agent_orchestrator import agent_orchestrator
from app.services.storage import storage

logger = logging.getLogger("echovault.omi")


class OmiService:
    def verify_auth(self, token: Optional[str]) -> bool:
        expected = settings.omi_secret_effective
        if not expected:
            return True
        return token == expected

    async def handle_conversation_webhook(
        self,
        payload: Dict[str, Any],
        uid: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Parses Omi completed conversation payload.
        Supported format:
        {
          "id": "memory_123",
          "transcript_segments": [{"text": "...", "speaker": "..."}],
          "structured": {"title": "..."},
          ...
        }
        """
        raw_id = payload.get("id") or payload.get("session_id") or str(uuid.uuid4())
        claim_key = f"omi_conv_{raw_id}"

        # Idempotency check
        if not storage.omi_claim(claim_key):
            logger.info("Omi conversation webhook skipped (already processed): %s", raw_id)
            return {"status": "duplicate_ignored", "session_id": raw_id}

        # Extract transcript
        transcript = payload.get("transcript") or ""
        segments = payload.get("transcript_segments") or []
        if not transcript and segments and isinstance(segments, list):
            transcript_parts = []
            for s in segments:
                if isinstance(s, dict) and s.get("text"):
                    spk = s.get("speaker_name") or s.get("speaker") or ""
                    prefix = f"{spk}: " if spk else ""
                    transcript_parts.append(f"{prefix}{s['text']}")
            transcript = " ".join(transcript_parts)

        transcript = transcript.strip()
        if not transcript or len(transcript.split()) < 5:
            storage.omi_mark(claim_key, "ignored_empty")
            return {"status": "ignored_empty_transcript", "session_id": raw_id}

        structured = payload.get("structured") or {}
        title = structured.get("title") or f"Omi Voice Note ({raw_id[:8]})"
        user_id = uid or settings.DEFAULT_USER_ID

        # Background processing
        exec_id = f"exec-omi-{uuid.uuid4().hex[:8]}"
        corr_id = f"corr-omi-{uuid.uuid4().hex[:8]}"

        async def _run():
            try:
                res = await agent_orchestrator.process_transcript(
                    transcript=transcript,
                    title=title,
                    source="omi",
                    user_id=user_id,
                    execution_id=exec_id,
                    correlation_id=corr_id
                )
                status = "completed" if res.status == "completed" else "failed"
                storage.omi_mark(claim_key, status, exec_id)
            except Exception as e:
                logger.exception("Omi background processing error: %s", e)
                storage.omi_mark(claim_key, "failed", exec_id)

        asyncio.create_task(_run())

        return {
            "status": "processing_started",
            "session_id": raw_id,
            "execution_id": exec_id,
            "correlation_id": corr_id
        }

    async def handle_realtime_webhook(
        self,
        payload: Any,
        session_id: Optional[str] = None,
        uid: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Parses Omi real-time streaming segments: array of segments or dict with text.
        """
        sid = session_id or "realtime_stream"
        text_chunks = []
        if isinstance(payload, list):
            for item in payload:
                if isinstance(item, dict) and item.get("text"):
                    text_chunks.append(item["text"])
        elif isinstance(payload, dict):
            if payload.get("text"):
                text_chunks.append(payload["text"])

        combined = " ".join(text_chunks).strip()
        logger.info("Omi real-time segment received (%s chars) session=%s", len(combined), sid)
        return {
            "status": "stream_acknowledged",
            "session_id": sid,
            "received_chars": len(combined)
        }


omi_service = OmiService()
