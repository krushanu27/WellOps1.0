"""create audit_logs

Revision ID: YYYYMMDD_HHMM_create_audit_logs
Revises: c734a193ce14
Create Date: 2026-03-03
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "YYYYMMDD_HHMM_create_audit_logs"   
down_revision = "c734a193ce14"                 
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
    "audit_logs",
    sa.Column("id", sa.Integer(), primary_key=True),
    sa.Column(
        "user_id",
        postgresql.UUID(as_uuid=True),
        sa.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    ),
    sa.Column("action", sa.String(length=64), nullable=False),
    sa.Column("endpoint", sa.String(length=255), nullable=False),
    sa.Column("status_code", sa.Integer(), nullable=False),
    sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    sa.Column("metadata", sa.JSON(), nullable=True),
    )
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    op.create_index("ix_audit_logs_timestamp", "audit_logs", ["timestamp"])


def downgrade() -> None:
    op.drop_index("ix_audit_logs_timestamp", table_name="audit_logs")
    op.drop_index("ix_audit_logs_action", table_name="audit_logs")
    op.drop_index("ix_audit_logs_user_id", table_name="audit_logs")
    op.drop_table("audit_logs")