from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from database.init_db import get_db
from middleware.auth_middleware import get_current_user
from models.conversation import (
    Conversation,
    Message,
    ChatRequest,
    ChatResponse,
    MessageResponse,
)
from services.ai_service import get_ai_response
from config import MAX_CONVERSATION_MESSAGES

router = APIRouter(prefix="/api/chat", tags=["Chat"])


@router.post("/message", response_model=ChatResponse)
async def send_message(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Send a message to Nova and get an AI response."""
    user_id = user["user_id"]
    username = user.get("username", "User")

    # Get or create conversation
    if req.conversation_id:
        result = await db.execute(
            select(Conversation).where(
                Conversation.conversation_id == req.conversation_id,
                Conversation.user_id == user_id,
                Conversation.is_deleted == False,  # noqa: E712
            )
        )
        conversation = result.scalar_one_or_none()
        if not conversation:
            # Create new if not found
            conversation = Conversation(user_id=user_id, mode=req.mode)
            db.add(conversation)
            await db.flush()
    else:
        # Auto-title from first message
        title = req.message[:80] + ("..." if len(req.message) > 80 else "")
        conversation = Conversation(user_id=user_id, title=title, mode=req.mode)
        db.add(conversation)
        await db.flush()

    conv_id = conversation.conversation_id

    # Save user message
    user_msg = Message(
        conversation_id=conv_id,
        role="user",
        content=req.message,
    )
    db.add(user_msg)
    conversation.message_count += 1
    conversation.updated_at = datetime.now(timezone.utc)
    await db.flush()

    # Load recent conversation history for context
    history_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conv_id)
        .order_by(desc(Message.created_at))
        .limit(MAX_CONVERSATION_MESSAGES)
    )
    history_rows = list(reversed(history_result.scalars().all()))
    messages_for_ai = [{"role": m.role, "content": m.content} for m in history_rows]

    # Get AI response
    ai_result = await get_ai_response(messages_for_ai, mode=req.mode, user_name=username)

    # Save assistant message
    assistant_msg = Message(
        conversation_id=conv_id,
        role="assistant",
        content=ai_result["content"],
        language=ai_result["language"],
        model_used=ai_result["model"],
    )
    db.add(assistant_msg)
    conversation.message_count += 1
    conversation.updated_at = datetime.now(timezone.utc)
    await db.flush()

    return ChatResponse(
        response=ai_result["content"],
        conversation_id=conv_id,
        language=ai_result["language"],
    )
