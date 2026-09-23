"""add user role and profiles

Revision ID: a22ff0986288
Revises: 17bf3cdf8fd8
Create Date: 2026-09-23 14:41:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "a22ff0986288"
down_revision: str | None = "17bf3cdf8fd8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Mirrors app.db.base.TagList: JSONB on Postgres, JSON elsewhere.
TAG_LIST = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def _timestamps() -> list[sa.Column]:
    return [
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    ]


def upgrade() -> None:
    # server_default is required, not cosmetic: ADD COLUMN ... NOT NULL without a
    # default fails on a table that already has rows.
    op.add_column(
        "users",
        sa.Column("role", sa.String(length=20), server_default="student", nullable=False),
    )
    op.create_index("ix_users_role", "users", ["role"])

    op.create_table(
        "businesses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("company_name", sa.String(length=200), nullable=False),
        sa.Column("contact_name", sa.String(length=100), nullable=False),
        sa.Column("contact_phone", sa.String(length=16), nullable=False),
        *_timestamps(),
    )
    op.create_index("ix_businesses_user_id", "businesses", ["user_id"], unique=True)

    op.create_table(
        "students",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("skills", TAG_LIST, nullable=False),
        sa.Column("technologies", TAG_LIST, nullable=False),
        *_timestamps(),
    )
    op.create_index("ix_students_user_id", "students", ["user_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_students_user_id", table_name="students")
    op.drop_table("students")
    op.drop_index("ix_businesses_user_id", table_name="businesses")
    op.drop_table("businesses")
    op.drop_index("ix_users_role", table_name="users")
    # SQLite needs a table rebuild to drop a column; batch mode is a no-op on Postgres.
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("role")
