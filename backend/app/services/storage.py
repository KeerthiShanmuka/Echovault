"""Local persistence for memories (source records), tasks, executions and webhook idempotency keys.

Qdrant holds vectors + searchable payload; this JSON store is the system of record for the UI lists.
Writes are atomic and serialized with a lock. No sample data is seeded.
"""
import json
import os
import threading
from typing import Any, Callable, Dict, List, Optional

from app.config import settings
from app.models.schemas import MemoryItem, TaskItem, WorkflowExecution, utcnow

_EMPTY = {"memories": [], "tasks": [], "executions": [], "omi_processed": {}}


class StorageService:
    def __init__(self, data_dir=None) -> None:
        self.data_dir = data_dir or settings.DATA_DIR
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.path = self.data_dir / "echovault_store.json"
        self._lock = threading.RLock()
        if not self.path.exists():
            legacy_path = self.data_dir / "mindflow_store.json"
            if legacy_path.exists():
                try:
                    import shutil
                    shutil.copy2(legacy_path, self.path)
                except Exception:
                    self._save(dict(_EMPTY))
            else:
                self._save(dict(_EMPTY))

    # ------------------------------------------------------------ low level
    def _load(self) -> Dict[str, Any]:
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except (OSError, ValueError):
            data = {}
        for k, v in _EMPTY.items():
            data.setdefault(k, type(v)())
        return data

    def _save(self, data: Dict[str, Any]) -> None:
        tmp = self.path.with_suffix(".tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        os.replace(tmp, self.path)

    def _mutate(self, fn: Callable[[Dict[str, Any]], Any]) -> Any:
        with self._lock:
            data = self._load()
            out = fn(data)
            self._save(data)
            return out

    # ------------------------------------------------------------ memories
    def list_memories(self, user_id: str) -> List[MemoryItem]:
        with self._lock:
            return [MemoryItem(**m) for m in self._load()["memories"] if m.get("user_id") == user_id]

    def get_memory(self, user_id: str, memory_id: str) -> Optional[MemoryItem]:
        for m in self.list_memories(user_id):
            if m.id == memory_id:
                return m
        return None

    def save_memory(self, memory: MemoryItem) -> None:
        def fn(d):
            d["memories"] = [m for m in d["memories"] if m["id"] != memory.id]
            d["memories"].insert(0, memory.model_dump())
        self._mutate(fn)

    def delete_memory(self, user_id: str, memory_id: str) -> bool:
        def fn(d):
            before = len(d["memories"])
            d["memories"] = [m for m in d["memories"]
                             if not (m["id"] == memory_id and m.get("user_id") == user_id)]
            d["tasks"] = [t for t in d["tasks"]
                          if not (t.get("memory_id") == memory_id and t.get("user_id") == user_id)]
            return len(d["memories"]) < before
        return self._mutate(fn)

    def delete_all_for_user(self, user_id: str) -> int:
        def fn(d):
            n = sum(1 for m in d["memories"] if m.get("user_id") == user_id)
            d["memories"] = [m for m in d["memories"] if m.get("user_id") != user_id]
            d["tasks"] = [t for t in d["tasks"] if t.get("user_id") != user_id]
            return n
        return self._mutate(fn)

    # ------------------------------------------------------------ tasks
    def list_tasks(self, user_id: str) -> List[TaskItem]:
        with self._lock:
            return [TaskItem(**t) for t in self._load()["tasks"] if t.get("user_id") == user_id]

    def save_tasks(self, tasks: List[TaskItem]) -> None:
        ids = {t.id for t in tasks}
        def fn(d):
            d["tasks"] = [t.model_dump() for t in tasks] + [t for t in d["tasks"] if t["id"] not in ids]
        self._mutate(fn)

    def update_task(self, user_id: str, task_id: str, updates: Dict[str, Any]) -> Optional[TaskItem]:
        def fn(d):
            for i, t in enumerate(d["tasks"]):
                if t["id"] == task_id and t.get("user_id") == user_id:
                    edited = set(t.get("edited_fields", []))
                    for k, v in updates.items():
                        if t.get(k) != v:
                            t[k] = v
                            if k != "status":
                                edited.add(k)
                    t["edited_fields"] = sorted(edited)
                    t["is_user_edited"] = bool(edited)
                    t["updated_at"] = utcnow()
                    d["tasks"][i] = t
                    return TaskItem(**t)
            return None
        return self._mutate(fn)

    # ------------------------------------------------------------ executions
    def list_executions(self, user_id: str, limit: int = 50) -> List[WorkflowExecution]:
        with self._lock:
            rows = [e for e in self._load()["executions"] if e.get("user_id") == user_id]
        return [WorkflowExecution(**e) for e in rows[:limit]]

    def get_execution(self, user_id: str, execution_id: str) -> Optional[WorkflowExecution]:
        with self._lock:
            for e in self._load()["executions"]:
                if e["execution_id"] == execution_id and e.get("user_id") == user_id:
                    return WorkflowExecution(**e)
        return None

    def save_execution(self, execution: WorkflowExecution) -> None:
        def fn(d):
            rows = [e for e in d["executions"] if e["execution_id"] != execution.execution_id]
            existing = next((i for i, e in enumerate(d["executions"])
                             if e["execution_id"] == execution.execution_id), None)
            if existing is None:
                rows.insert(0, execution.model_dump())
            else:
                rows.insert(existing, execution.model_dump())
            d["executions"] = rows[:200]
        self._mutate(fn)

    # ------------------------------------------------------------ Omi idempotency
    def omi_claim(self, key: str) -> bool:
        """Atomically claim a webhook delivery key. Returns False if it was already processed/in-flight."""
        def fn(d):
            entry = d["omi_processed"].get(key)
            if entry and entry.get("status") in ("processing", "completed"):
                return False
            d["omi_processed"][key] = {"status": "processing", "at": utcnow()}
            return True
        return self._mutate(fn)

    def omi_mark(self, key: str, status: str, execution_id: Optional[str] = None) -> None:
        def fn(d):
            d["omi_processed"][key] = {"status": status, "at": utcnow(), "execution_id": execution_id}
        self._mutate(fn)


storage = StorageService()
