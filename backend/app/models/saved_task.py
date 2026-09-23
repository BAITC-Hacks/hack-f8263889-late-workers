from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.student import Student
    from app.models.task import Task


class SavedTask(Base):
    """A student's "Интересное" entry.

    Composite primary key rather than a surrogate id: it is an association row, and
    the key gives the contract's "one save per (student, task)" for free.
    """

    __tablename__ = "saved_tasks"
    __table_args__ = (Index("ix_saved_tasks_student_created", "student_id", "created_at"),)

    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), primary_key=True
    )
    task_id: Mapped[int] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    student: Mapped["Student"] = relationship(back_populates="saved_tasks")
    task: Mapped["Task"] = relationship(back_populates="saved_by")
