# app/auth/routes.py

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database.session import get_db
from app.users.models import User
from app.auth.passwords import verify_password
from app.auth.jwt import create_access_token
from app.audit.service import log_audit

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
    request: Request = None,
):
    user = db.execute(
        select(User).where(User.email == form_data.username)
    ).scalars().first()

    if not user or not verify_password(form_data.password, user.password_hash):
        log_audit(
            db,
            user_id=user.id if user else None,
            action="LOGIN_FAILED",
            endpoint=str(request.url.path) if request else "/auth/login",
            status_code=status.HTTP_401_UNAUTHORIZED,
            metadata={"username": form_data.username},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    token = create_access_token(
        {"sub": str(user.id), "role": user.role}
    )

    log_audit(
        db,
        user_id=user.id,
        action="LOGIN_SUCCESS",
        endpoint=str(request.url.path) if request else "/auth/login",
        status_code=status.HTTP_200_OK,
        metadata={"username": user.email, "role": user.role},
    )

    return {
        "access_token": token,
        "token_type": "bearer",
    }