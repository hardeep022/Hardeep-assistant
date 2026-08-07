import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Boolean, Integer, DateTime, Text, func, Index
from sqlalchemy.orm import Mapped, mapped_column
from pydantic import BaseModel

from database.init_db import Base


class Conversation(Base):
    __tablename__ = "conversations"

    conversation_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="New Conversation")
    mode: Mapped[str] = mapped_column(String(20), nullable=False, default="general")
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    language: Mapped[str] = mapped_column(String(5), nullable=False, default="en")
    message_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)

    __table_args__ = (
        Index("idx_conversations_updated_at", "updated_at"),
    )


class Message(Base):
    __tablename__ = "conversation_messages"

    message_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(10), nullable=False)  # user, assistant, system
    content: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[str] = mapped_column(String(5), nullable=False, default="en")
    token_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    model_used: Mapped[str | None] = mapped_column(String(50), nullable=True)
    input_type: Mapped[str] = mapped_column(String(10), nullable=False, default="text")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("idx_messages_created_at", "created_at"),
    )


# ── Pydantic Schemas ──


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    mode: str = "general"


class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    language: str


class MessageResponse(BaseModel):
    message_id: str
    role: str
    content: str
    language: str
    model_used: Optional[str] = None
    input_type: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationResponse(BaseModel):
    conversation_id: str
    title: str
    mode: str
    language: str
    message_count: int
    created_at: datetime
    updated_at: datetime
    is_pinned: bool

    model_config = {"from_attributes": True}


class ConversationDetailResponse(BaseModel):
    conversation_id: str
    title: str
    mode: str
    language: str
    message_count: int
    created_at: datetime
    updated_at: datetime
    is_pinned: bool
    messages: list[MessageResponse] = []

    model_config = {"from_attributes": True}
