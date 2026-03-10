from __future__ import annotations

from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.audit.models import AuditLog


def log_audit(
    db: Session,
    *,
    user_id: Optional[int],
    action: str,
    endpoint: str,
    status_code: int,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    db.add(
        AuditLog(
            user_id=user_id,
            action=action,
            endpoint=endpoint,
            status_code=status_code,
            meta=metadata,
        )
    )
    db.commit()