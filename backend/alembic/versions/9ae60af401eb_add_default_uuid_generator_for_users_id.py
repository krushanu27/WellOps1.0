from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "REPLACE_WITH_NEW_ID"
down_revision = "670d62e3af79"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")
    op.alter_column(
        "users",
        "id",
        server_default=sa.text("gen_random_uuid()"),
        existing_type=sa.dialects.postgresql.UUID(as_uuid=True),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "users",
        "id",
        server_default=None,
        existing_type=sa.dialects.postgresql.UUID(as_uuid=True),
        existing_nullable=False,
    )
