from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.milestone import Milestone
    from app.models.student import Student
    from app.models.task import Task
    from app.models.team import Team


class Proposal(TimestampMixin, Base):
    """A team's answer to a task."""

    __tablename__ = "proposals"
    __table_args__ = (
        # One live proposal per (task, team). Withdrawn ones are excluded, which is
        # exactly what lets a team apply again after withdrawing.
        Index(
            "uq_proposals_active",
            "task_id",
            "team_id",
            unique=True,
            postgresql_where="status IN ('sent', 'reviewing', 'selected')",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), index=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"), index=True)
    author_student_id: Mapped[int] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"))
    idea: Mapped[str] = mapped_column(Text)
    plan: Mapped[str] = mapped_column(Text)
    duration_weeks: Mapped[int] = mapped_column(Integer)
    prototype_url: Mapped[str | None] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(16), index=True)
    business_comment: Mapped[str | None] = mapped_column(Text)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    task: Mapped["Task"] = relationship(lazy="selectin")
    team: Mapped["Team"] = relationship(back_populates="proposals", lazy="selectin")
    author: Mapped["Student"] = relationship(lazy="selectin")
    milestones: Mapped[list["Milestone"]] = relationship(
        back_populates="proposal",
        cascade="all, delete-orphan",
        order_by="Milestone.created_at, Milestone.id",
        lazy="selectin",
    )
