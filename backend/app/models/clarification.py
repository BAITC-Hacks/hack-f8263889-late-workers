from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, JsonColumn

if TYPE_CHECKING:
    from app.models.task import Task


class ClarificationRound(Base):
    """One round of AI (or fallback) questions about a task draft."""

    __tablename__ = "clarification_rounds"
    __table_args__ = (UniqueConstraint("task_id", "number", name="uq_rounds_task_number"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), index=True)
    number: Mapped[int] = mapped_column(Integer)
    mode: Mapped[str] = mapped_column(String(16))  # ai | fallback
    assessment: Mapped[list[dict[str, Any]]] = mapped_column(JsonColumn, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    answered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    task: Mapped["Task"] = relationship(back_populates="rounds")
    questions: Mapped[list["RoundQuestion"]] = relationship(
        back_populates="round",
        cascade="all, delete-orphan",
        order_by="RoundQuestion.position",
        lazy="selectin",
    )


class RoundQuestion(Base):
    __tablename__ = "round_questions"

    id: Mapped[int] = mapped_column(primary_key=True)
    round_id: Mapped[int] = mapped_column(
        ForeignKey("clarification_rounds.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int] = mapped_column(Integer)
    block: Mapped[str] = mapped_column(String(32))
    text: Mapped[str] = mapped_column(Text)
    answer: Mapped[str | None] = mapped_column(Text)
    skipped: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")

    round: Mapped["ClarificationRound"] = relationship(back_populates="questions")
