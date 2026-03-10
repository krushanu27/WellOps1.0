# app/services/audit.py
from app.audit.models import AuditLog
from app.database.session import SessionLocal
from datetime import datetime, timezone


def utcnow():
    return datetime.now(timezone.utc)


def log_action(
    *,
    actor_user_id,
    actor_role: str,
    action: str,
    endpoint: str,
):
    db = SessionLocal()
    try:
        db.add(
            AuditLog(
                actor_user_id=actor_user_id,
                actor_role=actor_role,
                action=action,
                endpoint=endpoint,
                created_at=utcnow(),
            )
        )
        db.commit()
    finally:
        db.close()
