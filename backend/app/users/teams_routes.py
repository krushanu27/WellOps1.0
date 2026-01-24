from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import Team, User
from app.auth.deps import require_roles

router = APIRouter(prefix="/teams", tags=["teams"])


class TeamCreate(BaseModel):
    name: str
    department: str = "General"


@router.post("", status_code=201)
def create_team(
    payload: TeamCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("ADMIN")),
):
    team = Team(name=payload.name, department=payload.department)
    db.add(team)
    db.commit()
    db.refresh(team)
    return {"id": str(team.id), "name": team.name, "department": team.department}
