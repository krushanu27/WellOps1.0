from __future__ import annotations

from typing import Callable, Iterable, Sequence, Set

from fastapi import Depends, HTTPException, status

from app.auth.deps import get_current_user
from app.users.models import User


def require_roles(*allowed_roles: str) -> Callable:
    """
    Usage:
        Depends(require_roles("ADMIN"))
        Depends(require_roles("ADMIN", "MANAGER"))
    Requires the user to be authenticated (handled by get_current_user)
    and to have one of the allowed roles.

    Returns 401 if unauthenticated (from get_current_user),
    returns 403 if authenticated but role not allowed.
    """
    allowed: Set[str] = {r.upper() for r in allowed_roles}

    def _dep(current_user: User = Depends(get_current_user)) -> User:
        role = (getattr(current_user, "role", None) or "").upper()
        if role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden",
            )
        return current_user

    return _dep


def require_self_or_roles(*allowed_roles: str) -> Callable:
    """
    For endpoints where EMPLOYEE can only access their own record,
    while ADMIN/MANAGER (or whoever you pass) can access any.

    Expects the path parameter to be named `user_id`.
    """
    allowed: Set[str] = {r.upper() for r in allowed_roles}

    def _dep(user_id: int, current_user: User = Depends(get_current_user)) -> User:
        role = (getattr(current_user, "role", None) or "").upper()

        # If role is privileged, allow
        if role in allowed:
            return current_user

        # Otherwise enforce self-access only
        if int(getattr(current_user, "id")) != int(user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden",
            )
        return current_user

    return _dep