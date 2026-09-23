from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TagList

if TYPE_CHECKING:
    from app.models.proposal import Proposal
    from app.models.student import Student


class Team(Base):
    __tablename__ = "teams"
    # Names are unique regardless of case, which plain unique=True cannot express.
    __table_args__ = (Index("uq_teams_name_lower", func.lower("name"), unique=True),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(60))
    interests: Mapped[list[str]] = mapped_column(TagList, default=list)
    own_skills: Mapped[list[str]] = mapped_column(TagList, default=list)
    own_technologies: Mapped[list[str]] = mapped_column(TagList, default=list)
    points: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # lazy="selectin" throughout: the serializer reads every member's name, email
    # and tags, and a lazy load in the async response path raises MissingGreenlet.
    members: Mapped[list["TeamMember"]] = relationship(
        back_populates="team",
        cascade="all, delete-orphan",
        order_by="TeamMember.joined_at",
        lazy="selectin",
    )
    proposals: Mapped[list["Proposal"]] = relationship(
        back_populates="team", cascade="all, delete-orphan"
    )


class TeamMember(Base):
    __tablename__ = "team_members"
    __table_args__ = (
        Index(
            "uq_team_members_captain",
            "team_id",
            unique=True,
            postgresql_where="role = 'captain'",
        ),
    )

    team_id: Mapped[int] = mapped_column(
        ForeignKey("teams.id", ondelete="CASCADE"), primary_key=True
    )
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    role: Mapped[str] = mapped_column(String(16))  # captain | member
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    team: Mapped["Team"] = relationship(back_populates="members")
    student: Mapped["Student"] = relationship(back_populates="memberships", lazy="selectin")
