from fastapi import APIRouter, Depends

from app.auth.deps import get_current_user
from app.auth.rbac import require_roles
from app.users.models import User

router = APIRouter(prefix="/rbac-test", tags=["rbac-test"])


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email, "role": current_user.role}


@router.get("/admin-only")
def admin_only(current_user: User = Depends(require_roles("ADMIN"))):
    return {"ok": True, "role": current_user.role}