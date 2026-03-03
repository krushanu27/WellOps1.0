# app/auth/routes.py

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import select
from passlib.exc import UnknownHashError  # ✅ add this

from app.database.session import get_db
from app.users.models import User
from app.auth.passwords import verify_password
from app.auth.jwt import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.execute(
        select(User).where(User.email == form_data.username)
    ).scalars().first()

    # ✅ Optional debug (remove later)
    # print("LOGIN user:", user)
    # print("LOGIN hash:", (user.password_hash if user else None))

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    try:
        ok = verify_password(form_data.password, user.password_hash)
    except UnknownHashError:
        # Hash in DB is not a supported format (or corrupted/truncated)
        ok = False

    if not ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    token = create_access_token(
        {"sub": str(user.id), "role": user.role}
    )

    return {
        "access_token": token,
        "token_type": "bearer",
    }