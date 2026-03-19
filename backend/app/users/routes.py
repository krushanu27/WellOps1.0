from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user, require_roles
from app.auth.passwords import hash_password
from app.database.session import get_db
from app.users.models import User
from app.users.schemas import (
    UserCreateRequest,
    UserUpdateRequest,
    UserResponse,
)

# Adjust this import to your real Team model path
from app.users.models import Team

router = APIRouter(prefix="/users", tags=["users"])


def _validate_team_assignment(db: Session, role: str, team_id):
    if role == "ADMIN":
        if team_id is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ADMIN user cannot be assigned to a team",
            )
        return

    if team_id is not None:
        team = db.execute(
            select(Team).where(Team.id == team_id)
        ).scalars().first()
        if not team:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid team_id",
            )


def _ensure_not_last_admin(db: Session, user: User, next_role: str | None = None):
    current_role = user.role
    target_role = next_role if next_role is not None else current_role

    if current_role == "ADMIN" and target_role != "ADMIN":
        admin_count = db.execute(
            select(func.count()).select_from(User).where(User.role == "ADMIN")
        ).scalar_one()
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove or demote the last ADMIN user",
            )


@router.get("", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("ADMIN")),
):
    users = db.execute(
        select(User).order_by(User.email.asc())
    ).scalars().all()
    return users


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("ADMIN")),
):
    existing = db.execute(
        select(User).where(User.email == payload.email)
    ).scalars().first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists",
        )

    _validate_team_assignment(db, payload.role, payload.team_id)

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        team_id=payload.team_id,
    )

    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: UUID,
    payload: UserUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN")),
):
    user = db.execute(
        select(User).where(User.id == user_id)
    ).scalars().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if payload.email is not None:
        existing = db.execute(
            select(User).where(User.email == payload.email, User.id != user_id)
        ).scalars().first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Another user with this email already exists",
            )
        user.email = payload.email

    next_role = payload.role if payload.role is not None else user.role
    next_team_id = payload.team_id if "team_id" in payload.model_fields_set else user.team_id

    _ensure_not_last_admin(db, user, next_role)
    _validate_team_assignment(db, next_role, next_team_id)

    if payload.role is not None:
        user.role = payload.role

    if "team_id" in payload.model_fields_set:
        user.team_id = payload.team_id

    if payload.password is not None:
        user.password_hash = hash_password(payload.password)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN")),
):
    user = db.execute(
        select(User).where(User.id == user_id)
    ).scalars().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if str(user.id) == str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account",
        )

    _ensure_not_last_admin(db, user, None)

    db.delete(user)
    db.commit()
    return None