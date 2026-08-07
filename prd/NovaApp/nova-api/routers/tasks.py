from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from database.init_db import get_db
from middleware.auth_middleware import get_current_user
from models.task import Task, TaskCreate, TaskUpdate, TaskResponse

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])


@router.get("", response_model=list[TaskResponse])
async def get_tasks(
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = Query(None),
    due: Optional[str] = Query(None),  # "today", "upcoming", "overdue"
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Get all tasks for the current user with optional filters."""
    query = select(Task).where(
        Task.user_id == user["user_id"],
        Task.is_deleted == False,  # noqa: E712
    )

    if status_filter:
        query = query.where(Task.status == status_filter)
    if priority:
        query = query.where(Task.priority == priority)

    now = datetime.now(timezone.utc)
    if due == "today":
        end_of_day = now.replace(hour=23, minute=59, second=59)
        query = query.where(Task.due_date != None, Task.due_date <= end_of_day)  # noqa: E711
    elif due == "overdue":
        query = query.where(
            Task.due_date != None,  # noqa: E711
            Task.due_date < now,
            Task.status != "completed",
        )
    elif due == "upcoming":
        query = query.where(Task.due_date != None, Task.due_date >= now)  # noqa: E711

    query = query.order_by(desc(Task.created_at))
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    req: TaskCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Create a new task."""
    task = Task(
        user_id=user["user_id"],
        description=req.description,
        priority=req.priority,
        due_date=req.due_date,
        tags=req.tags,
    )
    db.add(task)
    await db.flush()
    return task


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Get a single task by ID."""
    result = await db.execute(
        select(Task).where(
            Task.task_id == task_id,
            Task.user_id == user["user_id"],
            Task.is_deleted == False,  # noqa: E712
        )
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    req: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Update a task."""
    result = await db.execute(
        select(Task).where(
            Task.task_id == task_id,
            Task.user_id == user["user_id"],
            Task.is_deleted == False,  # noqa: E712
        )
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = req.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)

    # Auto-set completed_at
    if req.status == "completed" and not task.completed_at:
        task.completed_at = datetime.now(timezone.utc)
    elif req.status and req.status != "completed":
        task.completed_at = None

    task.updated_at = datetime.now(timezone.utc)
    await db.flush()
    return task


@router.patch("/{task_id}/complete", response_model=TaskResponse)
async def complete_task(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Mark a task as completed."""
    result = await db.execute(
        select(Task).where(
            Task.task_id == task_id,
            Task.user_id == user["user_id"],
            Task.is_deleted == False,  # noqa: E712
        )
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.status = "completed"
    task.completed_at = datetime.now(timezone.utc)
    task.updated_at = datetime.now(timezone.utc)
    await db.flush()
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Soft-delete a task."""
    result = await db.execute(
        select(Task).where(
            Task.task_id == task_id,
            Task.user_id == user["user_id"],
            Task.is_deleted == False,  # noqa: E712
        )
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.is_deleted = True
    await db.flush()
