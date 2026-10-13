from typing import List
from fastapi import APIRouter, HTTPException

from app.config import settings
from app.models.schemas import TaskItem, TaskUpdateRequest
from app.services.storage import storage

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])


@router.get("", response_model=List[TaskItem])
def list_tasks():
    return storage.list_tasks(settings.DEFAULT_USER_ID)


@router.patch("/{task_id}", response_model=TaskItem)
def update_task(task_id: str, req: TaskUpdateRequest):
    updates = req.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided for update.")

    updated = storage.update_task(settings.DEFAULT_USER_ID, task_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found.")
    return updated
