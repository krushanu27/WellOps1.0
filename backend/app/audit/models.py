from __future__ import annotations

from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID

from sqlalchemy import DateTime, Integer, String, JSON, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.session import Base  


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    user_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    action: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    endpoint: Mapped[str] = mapped_column(String(255), nullable=False)
    status_code: Mapped[int] = mapped_column(Integer, nullable=False)

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    meta: Mapped[Optional[Dict[str, Any]]] = mapped_column("metadata", JSON, nullable=True)