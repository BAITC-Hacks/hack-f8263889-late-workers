from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, JsonColumn, TagList, TimestampMixin

if TYPE_CHECKING:
    from app.models.business import Business
    from app.models.clarification import ClarificationRound
    from app.models.industry import Industry
    from app.models.saved_task import SavedTask


class Task(TimestampMixin, Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(
        ForeignKey("businesses.id", ondelete="CASCADE"), index=True
    )
    industry_code: Mapped[str] = mapped_column(ForeignKey("industries.code"), index=True)
    status: Mapped[str] = mapped_column(String(20), index=True)
    title: Mapped[str] = mapped_column(String(200))

    # The card's prose. Everything but the title may be empty while a task is a draft.
    context: Mapped[str | None] = mapped_column(Text)
    need: Mapped[str | None] = mapped_column(Text)
    target_users: Mapped[str | None] = mapped_column(Text)
    data_materials: Mapped[str | None] = mapped_column(Text)
    constraints: Mapped[str | None] = mapped_column(Text)
    expected_result: Mapped[str | None] = mapped_column(Text)
    success_criteria: Mapped[str | None] = mapped_column(Text)
    contact: Mapped[str | None] = mapped_column(Text)
    interaction_format: Mapped[str | None] = mapped_column(Text)

    rating: Mapped[int] = mapped_column(Integer, default=0, server_default="0", index=True)
    # Badge codes in reference order; recomputed with the rating, never edited by hand.
    badges: Mapped[list[str]] = mapped_column(TagList, default=list, server_default="[]")
    responses_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # --- Card builder ---
    draft_text: Mapped[str | None] = mapped_column(Text)
    # Per-field {source, confirmed, sources} for the title and the nine card fields.
    field_meta: Mapped[dict[str, Any]] = mapped_column(JsonColumn, default=dict)
    rating_breakdown: Mapped[list[dict[str, Any]] | None] = mapped_column(JsonColumn)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # lazy="selectin": every catalogue card serialises company_name and the industry
    # name, and a lazy load in the async response path raises MissingGreenlet.
    business: Mapped["Business"] = relationship(back_populates="tasks", lazy="selectin")
    industry: Mapped["Industry"] = relationship(lazy="selectin")
    rounds: Mapped[list["ClarificationRound"]] = relationship(
        back_populates="task",
        cascade="all, delete-orphan",
        order_by="ClarificationRound.number",
        lazy="selectin",
    )
    saved_by: Mapped[list["SavedTask"]] = relationship(
        back_populates="task", cascade="all, delete-orphan"
    )
