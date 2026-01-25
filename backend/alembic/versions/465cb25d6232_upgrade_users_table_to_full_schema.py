from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "XXXXXXXXXXXX"          # <-- replace with your revision id
down_revision = "c734a193ce14"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Users table upgrades
    op.add_column(
        "users",
        sa.Column("email", sa.String(length=320), nullable=False),
    )
    op.add_column(
        "users",
        sa.Column("password_hash", sa.String(length=255), nullable=False),
    )
    op.add_column(
        "users",
        sa.Column("role", sa.String(length=20), nullable=False, server_default="EMPLOYEE"),
    )
    op.add_column(
        "users",
        sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    # Constraints & indexes
    op.create_unique_constraint("uq_users_email", "users", ["email"])
    op.create_index("ix_users_email", "users", ["email"])

    op.create_foreign_key(
        "fk_users_team_id",
        "users",
        "teams",
        ["team_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_users_team_id", "users", type_="foreignkey")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_constraint("uq_users_email", "users", type_="unique")

    op.drop_column("users", "created_at")
    op.drop_column("users", "team_id")
    op.drop_column("users", "role")
    op.drop_column("users", "password_hash")
    op.drop_column("users", "email")
