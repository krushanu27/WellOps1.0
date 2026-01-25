from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "8b860b02363e"          # <-- replace with new revision id
down_revision = "REPLACE_WITH_NEW_ID"  # <-- replace with output from `alembic current`
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("audit_logs", sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("audit_logs", sa.Column("actor_role", sa.String(length=20), nullable=False, server_default="UNKNOWN"))
    op.add_column("audit_logs", sa.Column("action", sa.String(length=100), nullable=False, server_default="UNKNOWN_ACTION"))
    op.add_column("audit_logs", sa.Column("endpoint", sa.String(length=200), nullable=False, server_default="UNKNOWN_ENDPOINT"))
    op.add_column("audit_logs", sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")))

    # OPTIONAL: remove server defaults for action/endpoint after backfilling
    # (we keep them to avoid failure if table already has rows)


def downgrade() -> None:
    op.drop_column("audit_logs", "created_at")
    op.drop_column("audit_logs", "endpoint")
    op.drop_column("audit_logs", "action")
    op.drop_column("audit_logs", "actor_role")
    op.drop_column("audit_logs", "actor_user_id")
