from typing import Any, Dict
from fastapi import APIRouter, HTTPException

from app.config import settings
from app.models.schemas import ChatRequest
from app.services.agent_orchestrator import agent_orchestrator

router = APIRouter(prefix="/api/chat", tags=["Chat"])


@router.post("")
async def chat_with_memory(req: ChatRequest) -> Dict[str, Any]:
    try:
        res = await agent_orchestrator.answer_chat_query(
            query=req.message,
            user_id=settings.DEFAULT_USER_ID,
            session_id=req.session_id
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
