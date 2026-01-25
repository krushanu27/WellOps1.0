"""merge survey and users migrations

Revision ID: 670d62e3af79
Revises: c5c1581daf45, XXXXXXXXXXXX
Create Date: 2026-01-25 15:14:44.557536

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '670d62e3af79'
down_revision: Union[str, Sequence[str], None] = ('c5c1581daf45', 'XXXXXXXXXXXX')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
