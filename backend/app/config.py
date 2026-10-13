from pathlib import Path
from typing import Optional, List

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    # App
    PROJECT_NAME: str = "EchoVault AI"
    VERSION: str = "1.1.0"
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    HOST: str = "127.0.0.1"
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # Lyzr (documented v3 inference endpoint)
    LYZR_API_KEY: Optional[str] = None
    LYZR_MANAGER_AGENT_ID: Optional[str] = None
    LYZR_SUMMARIZER_AGENT_ID: Optional[str] = None
    LYZR_TASK_AGENT_ID: Optional[str] = None
    LYZR_MEMORY_AGENT_ID: Optional[str] = None
    LYZR_CHAT_URL: str = "https://agent-prod.studio.lyzr.ai/v3/inference/chat/"
    LYZR_TIMEOUT_SECONDS: float = 90.0
    LYZR_MAX_CONCURRENCY: int = 3

    # Qdrant
    QDRANT_URL: Optional[str] = None
    QDRANT_API_KEY: Optional[str] = None
    QDRANT_COLLECTION: str = "mindflow_memories"
    QDRANT_TIMEOUT_SECONDS: int = 20

    # Embeddings — must stay identical between indexing and search.
    EMBEDDING_PROVIDER: str = "fastembed"
    EMBEDDING_API_KEY: Optional[str] = None
    EMBEDDING_MODEL_NAME: str = "BAAI/bge-small-en-v1.5"
    EMBEDDING_DIMENSION: int = 384

    # Omi
    OMI_WEBHOOK_SECRET: Optional[str] = None

    # Limits
    MAX_TRANSCRIPT_CHARS: int = 50_000
    MAX_QUESTION_CHARS: int = 2_000
    MAX_SEARCH_RESULTS: int = 10
    RETRIEVAL_SCORE_THRESHOLD: float = 0.35

    # Single-user local demo identity (see README "Authentication limitations").
    DEFAULT_USER_ID: str = "default_user"

    DATA_DIR: Path = BACKEND_DIR / "data"

    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> List[str]:
        origins = {self.FRONTEND_ORIGIN, "http://localhost:5173", "http://127.0.0.1:5173"}
        return sorted(o for o in origins if o)

    @property
    def omi_secret_effective(self) -> Optional[str]:
        """The Omi shared token, or None. URL-looking values are not treated as secrets."""
        s = (self.OMI_WEBHOOK_SECRET or "").strip()
        if not s or s.lower().startswith(("http://", "https://")):
            return None
        return s

    @property
    def omi_secret_misconfigured(self) -> bool:
        s = (self.OMI_WEBHOOK_SECRET or "").strip()
        return s.lower().startswith(("http://", "https://"))

    def missing_lyzr_vars(self) -> List[str]:
        names = ["LYZR_API_KEY", "LYZR_MANAGER_AGENT_ID", "LYZR_SUMMARIZER_AGENT_ID",
                 "LYZR_TASK_AGENT_ID", "LYZR_MEMORY_AGENT_ID"]
        return [n for n in names if not getattr(self, n)]

    def missing_qdrant_vars(self) -> List[str]:
        return [n for n in ["QDRANT_URL", "QDRANT_API_KEY"] if not getattr(self, n)]


settings = Settings()
