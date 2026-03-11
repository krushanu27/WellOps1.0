# app/ethics/routes.py
from __future__ import annotations

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.auth.deps import get_current_user
from app.ethics.models import UserConsent
from app.users.models import User


router = APIRouter(prefix="/ethics", tags=["ethics"])


class ConsentBody(BaseModel):
    consent_type: str  # e.g. "SURVEY_DATA", "ANALYTICS"


@router.get("/consent")
def get_my_consents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all consent records for the current user."""
    consents = db.execute(
        select(UserConsent).where(UserConsent.user_id == current_user.id)
    ).scalars().all()

    return [
        {
            "id": str(c.id),
            "consent_type": c.consent_type,
            "granted": c.granted,
            "granted_at": c.granted_at,
            "revoked_at": c.revoked_at,
        }
        for c in consents
    ]


@router.post("/consent", status_code=201)
def grant_consent(
    body: ConsentBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Grant consent for a specific type."""
    existing = db.execute(
        select(UserConsent).where(
            UserConsent.user_id == current_user.id,
            UserConsent.consent_type == body.consent_type,
        )
    ).scalars().first()

    now = datetime.now(timezone.utc)

    if existing:
        existing.granted = True
        existing.granted_at = now
        existing.revoked_at = None
    else:
        existing = UserConsent(
            user_id=current_user.id,
            consent_type=body.consent_type,
            granted=True,
            granted_at=now,
        )
        db.add(existing)

    db.commit()
    db.refresh(existing)

    return {
        "id": str(existing.id),
        "consent_type": existing.consent_type,
        "granted": existing.granted,
        "granted_at": existing.granted_at,
    }


@router.delete("/consent/{consent_type}")
def revoke_consent(
    consent_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Revoke a previously granted consent."""
    record = db.execute(
        select(UserConsent).where(
            UserConsent.user_id == current_user.id,
            UserConsent.consent_type == consent_type,
        )
    ).scalars().first()

    if not record:
        raise HTTPException(404, "Consent record not found")

    record.granted = False
    record.revoked_at = datetime.now(timezone.utc)
    db.commit()

    return {"status": "revoked", "consent_type": consent_type}
