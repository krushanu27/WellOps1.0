from alembic import op


# revision identifiers, used by Alembic.
revision = "c5c1581daf45"
down_revision = "c734a193ce14"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the wrongly-created column
    op.drop_column("survey_questions", "order")


def downgrade() -> None:
    # Recreate it only if someone downgrades (unlikely, but correct)
    op.add_column(
        "survey_questions",
        op.sa.Column("order", op.sa.Integer(), nullable=False, server_default="0"),
    )
