"""merge heads

Revision ID: 6fc81e0a84c1
Revises: 8b860b02363e, YYYYMMDD_HHMM_create_audit_logs
Create Date: 2026-03-03 17:38:18.131365

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6fc81e0a84c1'
down_revision: Union[str, Sequence[str], None] = ('8b860b02363e', 'YYYYMMDD_HHMM_create_audit_logs')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
