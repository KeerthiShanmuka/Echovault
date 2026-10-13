from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional
import uuid

from pydantic import BaseModel, Field, field_validator

from app.config import settings


def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


StepStatus = Literal["waiting", "running", "completed", "failed", "skipped"]
WorkflowStatus = Literal["queued", "running", "completed", "failed"]
WorkflowType = Literal["transcript_ingestion", "chat_query"]


# ---------------------------------------------------------------- Memories
class MemoryItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = settings.DEFAULT_USER_ID
    conversation_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    source: Literal["manual", "omi", "voice"] = "manual"
    timestamp: str = Field(default_factory=utcnow)
    transcript: str
    summary: str = ""
    topics: List[str] = []
    facts: List[str] = []
    people: List[str] = []
    task_ids: List[str] = []
    embedding_model: str = settings.EMBEDDING_MODEL_NAME
    correlation_id: Optional[str] = None
    created_at: str = Field(default_factory=utcnow)


class MemoryCitation(BaseModel):
    memory_id: str
    conversation_id: Optional[str] = None
    title: str = "Conversation"
    timestamp: str = ""
    source: str = "manual"
    excerpt: str
    similarity_score: float


class MemorySearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=settings.MAX_QUESTION_CHARS)
    limit: int = Field(default=5, ge=1, le=settings.MAX_SEARCH_RESULTS)
    score_threshold: float = Field(default=settings.RETRIEVAL_SCORE_THRESHOLD, ge=0.0, le=1.0)


class MemorySearchResponse(BaseModel):
    query: str
    results: List[MemoryCitation] = []
    total_found: int = 0


class DeleteAllRequest(BaseModel):
    confirm: str

    @field_validator("confirm")
    @classmethod
    def must_confirm(cls, v: str) -> str:
        if v != "DELETE":
            raise ValueError('Type "DELETE" to confirm deleting all memories.')
        return v


# ---------------------------------------------------------------- Tasks
class TaskItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = settings.DEFAULT_USER_ID
    memory_id: Optional[str] = None
    conversation_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    deadline: Optional[str] = None
    status: Literal["pending", "in_progress", "completed"] = "pending"
    priority: Literal["low", "medium", "high"] = "medium"
    assigned_owner: Optional[str] = None
    is_user_edited: bool = False
    edited_fields: List[str] = []
    extracted: Dict[str, Any] = {}  # original values as produced by the Task Extractor Agent
    created_at: str = Field(default_factory=utcnow)
    updated_at: str = Field(default_factory=utcnow)


class TaskUpdateRequest(BaseModel):
    status: Optional[Literal["pending", "in_progress", "completed"]] = None
    priority: Optional[Literal["low", "medium", "high"]] = None
    title: Optional[str] = Field(default=None, min_length=1, max_length=300)
    description: Optional[str] = Field(default=None, max_length=2000)
    deadline: Optional[str] = Field(default=None, max_length=40)
    assigned_owner: Optional[str] = Field(default=None, max_length=120)


# ---------------------------------------------------------------- Workflow telemetry
class AgentStepEvent(BaseModel):
    key: str
    agent_name: str
    role: str
    is_lyzr_agent: bool = False
    status: StepStatus = "waiting"
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    duration_ms: Optional[int] = None
    input_preview: Optional[str] = None
    output_preview: Optional[str] = None
    error_message: Optional[str] = None


class WorkflowError(BaseModel):
    code: str
    message: str
    step_key: Optional[str] = None


class WorkflowExecution(BaseModel):
    execution_id: str = Field(default_factory=lambda: f"exec-{uuid.uuid4().hex[:12]}")
    correlation_id: str = Field(default_factory=lambda: f"corr-{uuid.uuid4().hex[:12]}")
    user_id: str = settings.DEFAULT_USER_ID
    workflow_type: WorkflowType
    status: WorkflowStatus = "queued"
    label: str = ""
    created_at: str = Field(default_factory=utcnow)
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    total_duration_ms: Optional[int] = None
    steps: List[AgentStepEvent] = []
    error: Optional[WorkflowError] = None
    result: Dict[str, Any] = {}


class WorkflowAccepted(BaseModel):
    execution_id: str
    correlation_id: str
    status: WorkflowStatus


# ---------------------------------------------------------------- Requests
class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=settings.MAX_QUESTION_CHARS)
    session_id: Optional[str] = Field(default=None, max_length=100)

    @field_validator("message")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Question cannot be empty.")
        return v.strip()


class TranscriptIngestRequest(BaseModel):
    transcript: str = Field(min_length=1, max_length=settings.MAX_TRANSCRIPT_CHARS)
    title: Optional[str] = Field(default=None, max_length=200)
    source: Literal["manual", "omi", "voice"] = "manual"

    @field_validator("transcript")
    @classmethod
    def enough_words(cls, v: str) -> str:
        v = v.strip()
        if len(v.split()) < 5:
            raise ValueError("Transcript is too short. Provide at least 5 words.")
        return v


# ---------------------------------------------------------------- Agents / system
class AgentInfo(BaseModel):
    key: str
    name: str
    role: str
    configured: bool
    runs: int = 0
    last_status: Optional[StepStatus] = None
    last_run_at: Optional[str] = None
    last_error: Optional[str] = None
    avg_duration_ms: Optional[int] = None


class StatsResponse(BaseModel):
    memories: int
    conversations: int
    tasks_total: int
    tasks_pending: int
    tasks_completed: int
    questions_answered: int
    workflows_failed: int
