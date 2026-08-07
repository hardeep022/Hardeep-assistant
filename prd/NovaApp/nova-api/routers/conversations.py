from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from database.init_db import get_db
from middleware.auth_middleware import get_current_user
from models.conversation import (
    Conversation,
    Message,
    ConversationResponse,
    ConversationDetailResponse,
    MessageResponse,
)

router = APIRouter(prefix="/api/conversations", tags=["Conversations"])


@router.get("", response_model=list[ConversationResponse])
async def get_conversations(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=200),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """List all conversations for the current user."""
    query = select(Conversation).where(
        Conversation.user_id == user["user_id"],
        Conversation.is_deleted == False,  # noqa: E712
    )

    if search:
        query = query.where(Conversation.title.ilike(f"%{search}%"))

    query = query.order_by(desc(Conversation.updated_at))
    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Get a conversation with all its messages."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.conversation_id == conversation_id,
            Conversation.user_id == user["user_id"],
            Conversation.is_deleted == False,  # noqa: E712
        )
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Load messages
    msg_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )
    messages = msg_result.scalars().all()

    return ConversationDetailResponse(
        conversation_id=conversation.conversation_id,
        title=conversation.title,
        mode=conversation.mode,
        language=conversation.language,
        message_count=conversation.message_count,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        is_pinned=conversation.is_pinned,
        messages=[MessageResponse.model_validate(m) for m in messages],
    )


@router.delete("/{conversation_id}", status_code=204)
async def delete_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Soft-delete a conversation."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.conversation_id == conversation_id,
            Conversation.user_id == user["user_id"],
            Conversation.is_deleted == False,  # noqa: E712
        )
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conversation.is_deleted = True
    await db.flush()
