"""Import every model here so Alembic autogenerate and relationships see them."""

from app.models.ai_call import AiCall
from app.models.business import Business
from app.models.clarification import ClarificationRound, RoundQuestion
from app.models.industry import Industry
from app.models.note import Note
from app.models.proposal import Proposal
from app.models.saved_task import SavedTask
from app.models.student import Student
from app.models.task import Task
from app.models.team import Team, TeamMember
from app.models.user import User

__all__ = [
    "AiCall",
    "Business",
    "ClarificationRound",
    "Industry",
    "Note",
    "Proposal",
    "RoundQuestion",
    "SavedTask",
    "Student",
    "Task",
    "Team",
    "TeamMember",
    "User",
]
