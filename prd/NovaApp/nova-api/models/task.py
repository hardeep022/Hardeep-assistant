import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Boolean, DateTime, Text, JSON, func, Index
from sqlalchemy.orm import Mapped, mapped_column
from pydantic import BaseModel, Field

from database.init_db import Base


class Task(Base):
    __tablename__ = "tasks"

    task_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    priority: Mapped[str] = mapped_column(String(10), nullable=False, default="medium")
    due_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    tags: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)

    __table_args__ = (
        Index("idx_tasks_due_date", "due_date"),
        Index("idx_tasks_status", "status"),
    )


# ── Pydantic Schemas ──


class TaskCreate(BaseModel):
    description: str = Field(min_length=1, max_length=2000)
    priority: str = Field(default="medium", pattern=r"^(low|medium|high|urgent)$")
    due_date: Optional[datetime] = None
    tags: Optional[list[str]] = None


class TaskUpdate(BaseModel):
    description: Optional[str] = Field(default=None, max_length=2000)
    priority: Optional[str] = Field(default=None, pattern=r"^(low|medium|high|urgent)$")
    status: Optional[str] = Field(default=None, pattern=r"^(pending|in_progress|completed)$")
    due_date: Optional[datetime] = None
    tags: Optional[list[str]] = None


class TaskResponse(BaseModel):
    task_id: str
    user_id: str
    description: str
    status: str
    priority: str
    due_date: Optional[datetime] = None
    tags: Optional[list[str]] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
