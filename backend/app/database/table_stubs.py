# app/database/table_stubs.py
from sqlalchemy import Column, Table
from sqlalchemy.dialects.postgresql import UUID

from app.database.session import Base

# Minimal definitions so Alembic can resolve ForeignKeys during autogenerate.
# These tables already exist in your DB from Phase 1.
Table(
    "users",
    Base.metadata,
    Column("id", UUID(as_uuid=True), primary_key=True),
    extend_existing=True,
)

Table(
    "teams",
    Base.metadata,
    Column("id", UUID(as_uuid=True), primary_key=True),
    extend_existing=True,
)

Table(
    "audit_logs",
    Base.metadata,
    Column("id", UUID(as_uuid=True), primary_key=True),
    extend_existing=True,
)
