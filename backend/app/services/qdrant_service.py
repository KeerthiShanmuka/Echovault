"""Qdrant Cloud vector store. All client calls run in worker threads."""
import asyncio
import logging
from typing import Any, Dict, List, Optional

from app.config import settings

logger = logging.getLogger("echovault.qdrant")


class QdrantError(Exception):
    def __init__(self, message: str, code: str = "qdrant_error"):
        super().__init__(message)
        self.code = code
        self.message = message


class QdrantService:
    def __init__(self) -> None:
        self.collection = settings.QDRANT_COLLECTION
        self.dimension = settings.EMBEDDING_DIMENSION
        self._client = None
        self._collection_ready = False

    def is_configured(self) -> bool:
        return not settings.missing_qdrant_vars()

    def _client_sync(self):
        if not self.is_configured():
            raise QdrantError(
                f"Qdrant is not configured. Missing: {', '.join(settings.missing_qdrant_vars())}.",
                "qdrant_not_configured")
        if self._client is None:
            from qdrant_client import QdrantClient
            self._client = QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY,
                                        timeout=settings.QDRANT_TIMEOUT_SECONDS)
        return self._client

    def _ensure_collection_sync(self) -> None:
        if self._collection_ready:
            return
        from qdrant_client.models import Distance, PayloadSchemaType, VectorParams
        client = self._client_sync()
        if not client.collection_exists(self.collection):
            client.create_collection(self.collection,
                                     vectors_config=VectorParams(size=self.dimension, distance=Distance.COSINE))
            logger.info("Created Qdrant collection %s (%s dims, cosine)", self.collection, self.dimension)
        else:
            info = client.get_collection(self.collection)
            vectors = info.config.params.vectors
            size = getattr(vectors, "size", None)
            if size is not None and size != self.dimension:
                raise QdrantError(
                    f"Collection '{self.collection}' uses {size}-dim vectors but the embedding model produces "
                    f"{self.dimension}. Refusing to mix models; use a new QDRANT_COLLECTION.",
                    "qdrant_dimension_mismatch")
        for field in ("user_id", "memory_id"):
            try:
                client.create_payload_index(self.collection, field_name=field,
                                            field_schema=PayloadSchemaType.KEYWORD)
            except Exception:
                pass  # index already exists
        self._collection_ready = True

    async def _run(self, fn, *args):
        try:
            return await asyncio.to_thread(fn, *args)
        except QdrantError:
            raise
        except Exception as e:
            logger.warning("Qdrant operation failed: %s", type(e).__name__)
            raise QdrantError(f"Qdrant request failed ({type(e).__name__}).") from e

    async def ensure_collection(self) -> None:
        await self._run(self._ensure_collection_sync)

    # ----------------------------------------------------------------- writes
    def _upsert_sync(self, point_id: str, vector: List[float], payload: Dict[str, Any]) -> None:
        from qdrant_client.models import PointStruct
        self._ensure_collection_sync()
        self._client_sync().upsert(self.collection, points=[PointStruct(id=point_id, vector=vector, payload=payload)],
                                   wait=True)

    async def upsert_memory(self, memory_id: str, vector: List[float], payload: Dict[str, Any]) -> None:
        await self._run(self._upsert_sync, memory_id, vector, payload)

    def _user_filter(self, user_id: str, memory_id: Optional[str] = None):
        from qdrant_client.models import FieldCondition, Filter, MatchValue
        must = [FieldCondition(key="user_id", match=MatchValue(value=user_id))]
        if memory_id:
            must.append(FieldCondition(key="memory_id", match=MatchValue(value=memory_id)))
        return Filter(must=must)

    def _delete_sync(self, user_id: str, memory_id: Optional[str]) -> None:
        from qdrant_client.models import FilterSelector
        self._ensure_collection_sync()
        self._client_sync().delete(self.collection,
                                   points_selector=FilterSelector(filter=self._user_filter(user_id, memory_id)),
                                   wait=True)

    async def delete_memory(self, user_id: str, memory_id: str) -> None:
        await self._run(self._delete_sync, user_id, memory_id)

    async def delete_all_for_user(self, user_id: str) -> None:
        await self._run(self._delete_sync, user_id, None)

    # ----------------------------------------------------------------- reads
    def _search_sync(self, vector: List[float], user_id: str, limit: int, threshold: float):
        self._ensure_collection_sync()
        res = self._client_sync().query_points(self.collection, query=vector,
                                               query_filter=self._user_filter(user_id),
                                               limit=limit, score_threshold=threshold, with_payload=True)
        return [(float(p.score), p.payload or {}) for p in res.points]

    async def search(self, vector: List[float], user_id: str, limit: int, threshold: float):
        return await self._run(self._search_sync, vector, user_id, limit, threshold)

    def _count_sync(self, user_id: str) -> int:
        self._ensure_collection_sync()
        return self._client_sync().count(self.collection, count_filter=self._user_filter(user_id), exact=True).count

    async def count(self, user_id: str) -> int:
        return await self._run(self._count_sync, user_id)


qdrant_service = QdrantService()
