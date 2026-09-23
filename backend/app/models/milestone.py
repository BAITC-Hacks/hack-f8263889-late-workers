from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.proposal import Proposal

DEFAULT_MILESTONE_POINTS = 10


class Milestone(Base):
    """A unit of work the business sets for the selected team.

    `points` is stored per row: the team's total is derived from confirmed rows,
    so changing the default later cannot rewrite already-earned history.
    """

    __tablename__ = "milestones"

    id: Mapped[int] = mapped_column(primary_key=True)
    proposal_id: Mapped[int] = mapped_column(
        ForeignKey("proposals.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(200))
    confirmed: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    points: Mapped[int] = mapped_column(
        Integer, default=DEFAULT_MILESTONE_POINTS, server_default="10"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    proposal: Mapped["Proposal"] = relationship(back_populates="milestones")
