import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query

from app.config import settings
from app.models.schemas import (
    DeleteAllRequest,
    MemoryCitation,
    MemoryItem,
    MemorySearchRequest,
    MemorySearchResponse
)
from app.services.embedding_service import embedding_service
from app.services.qdrant_service import qdrant_service
from app.services.storage import storage

logger = logging.getLogger("echovault.routers.memories")
router = APIRouter(prefix="/api/memories", tags=["Memories"])


@router.get("", response_model=List[MemoryItem])
def list_memories():
    return storage.list_memories(settings.DEFAULT_USER_ID)


@router.post("/search", response_model=MemorySearchResponse)
async def search_memories(req: MemorySearchRequest):
    try:
        vec = await embedding_service.embed(req.query)
        hits = await qdrant_service.search(
            vec,
            user_id=settings.DEFAULT_USER_ID,
            limit=req.limit,
            threshold=req.score_threshold
        )
        citations: List[MemoryCitation] = []
        for score, payload in hits:
            excerpt = payload.get("summary") or payload.get("transcript", "")
            if len(excerpt) > 280:
                excerpt = excerpt[:280] + "..."
            citations.append(MemoryCitation(
                memory_id=str(payload.get("memory_id", "")),
                conversation_id=str(payload.get("conversation_id", "")),
                title=str(payload.get("title", "Voice Memory")),
                timestamp=str(payload.get("timestamp", "")),
                source=str(payload.get("source", "manual")),
                excerpt=excerpt,
                similarity_score=round(score, 3)
            ))
        return MemorySearchResponse(query=req.query, results=citations, total_found=len(citations))
    except Exception as e:
        logger.warning("Search failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Memory search failed: {str(e)}")


@router.get("/{memory_id}", response_model=MemoryItem)
def get_memory(memory_id: str):
    mem = storage.get_memory(settings.DEFAULT_USER_ID, memory_id)
    if not mem:
        raise HTTPException(status_code=404, detail="Memory not found.")
    return mem


@router.delete("/{memory_id}")
async def delete_memory(memory_id: str):
    # Delete from Qdrant first
    try:
        await qdrant_service.delete_memory(settings.DEFAULT_USER_ID, memory_id)
    except Exception as e:
        logger.warning("Qdrant delete warning for %s: %s", memory_id, e)

    # Delete from local storage
    ok = storage.delete_memory(settings.DEFAULT_USER_ID, memory_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Memory not found.")
    return {"status": "deleted", "memory_id": memory_id}


@router.delete("")
async def delete_all_memories(req: DeleteAllRequest):
    # Requires explicit confirm="DELETE" in body
    try:
        await qdrant_service.delete_all_for_user(settings.DEFAULT_USER_ID)
    except Exception as e:
        logger.warning("Qdrant delete all warning: %s", e)

    count = storage.delete_all_for_user(settings.DEFAULT_USER_ID)
    return {"status": "purged", "count": count}
