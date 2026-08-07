from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.init_db import get_db
from models.user import User, RegisterRequest, LoginRequest, TokenResponse
from services.auth_service import (
    hash_password,
    verify_password,
    generate_recovery_key,
    create_token,
)
from config import MAX_LOGIN_ATTEMPTS, LOGIN_LOCKOUT_SECONDS

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user account."""
    # Check if username already exists
    existing = await db.execute(select(User).where(User.username == req.username))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists",
        )

    # Generate recovery key before hashing
    recovery_key = generate_recovery_key()

    user = User(
        username=req.username,
        display_name=req.display_name,
        password_hash=hash_password(req.password),
        recovery_key_hash=hash_password(recovery_key),
        language=req.language,
    )
    db.add(user)
    await db.flush()

    token = create_token(user.user_id, user.username)

    return TokenResponse(
        user_id=user.user_id,
        username=user.username,
        display_name=user.display_name,
        token=token,
        recovery_key=recovery_key,
    )


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Log in with username and password."""
    result = await db.execute(select(User).where(User.username == req.username))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    # Check lockout
    now = datetime.now(timezone.utc)
    if user.locked_until and user.locked_until.replace(tzinfo=timezone.utc) > now:
        remaining = int((user.locked_until.replace(tzinfo=timezone.utc) - now).total_seconds())
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Account locked. Try again in {remaining} seconds.",
        )

    # Verify password
    if not verify_password(req.password, user.password_hash):
        user.failed_login_count += 1
        if user.failed_login_count >= MAX_LOGIN_ATTEMPTS:
            from datetime import timedelta
            user.locked_until = now + timedelta(seconds=LOGIN_LOCKOUT_SECONDS)
            user.failed_login_count = 0
        await db.flush()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    # Success — reset counters
    user.failed_login_count = 0
    user.locked_until = None
    user.last_login_at = now
    await db.flush()

    token = create_token(user.user_id, user.username)

    return TokenResponse(
        user_id=user.user_id,
        username=user.username,
        display_name=user.display_name,
        token=token,
    )
