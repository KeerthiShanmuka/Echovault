from fastapi import APIRouter, HTTPException
from app.config import settings
from app.models.schemas import TranscriptIngestRequest, WorkflowExecution
from app.services.agent_orchestrator import agent_orchestrator

router = APIRouter(prefix="/api/transcripts", tags=["Transcripts"])


@router.post("", response_model=WorkflowExecution)
async def ingest_transcript(req: TranscriptIngestRequest):
    execution = await agent_orchestrator.process_transcript(
        transcript=req.transcript,
        title=req.title,
        source=req.source,
        user_id=settings.DEFAULT_USER_ID
    )
    if execution.status == "failed":
        err_msg = execution.error.message if execution.error else "Processing failed"
        raise HTTPException(status_code=500, detail=err_msg)
    return execution
