"""add teams and proposals

Revision ID: e03e652c01d0
Revises: f48093ef2675
Create Date: 2026-09-23 16:05:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "e03e652c01d0"
down_revision: str | None = "f48093ef2675"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Mirrors app.db.base.TagList.
TAG_LIST = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def upgrade() -> None:
    op.create_table(
        "teams",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=60), nullable=False),
        sa.Column("interests", TAG_LIST, nullable=False),
        sa.Column("own_skills", TAG_LIST, nullable=False),
        sa.Column("own_technologies", TAG_LIST, nullable=False),
        sa.Column("points", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    # Case-insensitive uniqueness needs a functional index.
    op.create_index("uq_teams_name_lower", "teams", [sa.text("lower(name)")], unique=True)

    op.create_table(
        "team_members",
        sa.Column(
            "team_id", sa.Integer(), sa.ForeignKey("teams.id", ondelete="CASCADE"), primary_key=True
        ),
        sa.Column(
            "student_id",
            sa.Integer(),
            sa.ForeignKey("students.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("role", sa.String(length=16), nullable=False),
        sa.Column(
            "joined_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_team_members_student_id", "team_members", ["student_id"])
    # Exactly one captain per team.
    op.create_index(
        "uq_team_members_captain",
        "team_members",
        ["team_id"],
        unique=True,
        postgresql_where=sa.text("role = 'captain'"),
    )

    op.create_table(
        "proposals",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "task_id", sa.Integer(), sa.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column(
            "team_id", sa.Integer(), sa.ForeignKey("teams.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column(
            "author_student_id",
            sa.Integer(),
            sa.ForeignKey("students.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("idea", sa.Text(), nullable=False),
        sa.Column("plan", sa.Text(), nullable=False),
        sa.Column("duration_weeks", sa.Integer(), nullable=False),
        sa.Column("prototype_url", sa.String(length=500), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("business_comment", sa.Text(), nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_proposals_task_id", "proposals", ["task_id"])
    op.create_index("ix_proposals_team_id", "proposals", ["team_id"])
    op.create_index("ix_proposals_status", "proposals", ["status"])
    # One live proposal per (task, team); withdrawn ones free the slot again.
    op.create_index(
        "uq_proposals_active",
        "proposals",
        ["task_id", "team_id"],
        unique=True,
        postgresql_where=sa.text("status IN ('sent', 'reviewing', 'selected')"),
    )


def downgrade() -> None:
    for index in (
        "uq_proposals_active",
        "ix_proposals_status",
        "ix_proposals_team_id",
        "ix_proposals_task_id",
    ):
        op.drop_index(index, table_name="proposals")
    op.drop_table("proposals")
    op.drop_index("uq_team_members_captain", table_name="team_members")
    op.drop_index("ix_team_members_student_id", table_name="team_members")
    op.drop_table("team_members")
    op.drop_index("uq_teams_name_lower", table_name="teams")
    op.drop_table("teams")
