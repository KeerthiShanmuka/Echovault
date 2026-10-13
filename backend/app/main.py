from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import (
    agents,
    chat,
    health,
    memories,
    omi,
    tasks,
    transcripts
)
from app.services.embedding_service import embedding_service
from app.services.qdrant_service import qdrant_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("echovault")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting EchoVault AI backend v%s", settings.VERSION)
    # Warm up embedding model & ensure Qdrant collection in background
    try:
        await embedding_service.warm_up()
        if qdrant_service.is_configured():
            await qdrant_service.ensure_collection()
            logger.info("Qdrant Cloud collection verified: %s", settings.QDRANT_COLLECTION)
        else:
            logger.warning("Qdrant credentials missing. Storage will be local-only until configured.")
    except Exception as e:
        logger.warning("Startup service verification note: %s", e)
    yield
    logger.info("EchoVault AI backend shutdown completed.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="EchoVault AI Multi-Agent Voice Memory Assistant API",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits local development and configured FRONTEND_ORIGIN
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all active routers
app.include_router(health.router)
app.include_router(memories.router)
app.include_router(transcripts.router)
app.include_router(tasks.router)
app.include_router(chat.router)
app.include_router(agents.router)
app.include_router(omi.router)
app.include_router(omi.router, prefix="/webhook")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
