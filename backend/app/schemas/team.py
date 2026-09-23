"""Team and proposal schemas. Reuses CodeName and the Z-suffix serializer from task."""

from datetime import datetime
from typing import Any

from pydantic import field_serializer

from app.schemas.base import ContractModel
from app.schemas.task import _utc_z


class MemberOut(ContractModel):
    student_id: int
    name: str
    email: str | None = None
    role: str
    skills: list[str]
    technologies: list[str]
    joined_at: datetime

    @field_serializer("joined_at")
    def _serialize_joined_at(self, value: datetime) -> str | None:
        return _utc_z(value)


class TeamOut(ContractModel):
    id: int
    name: str
    interests: list[str]
    own_skills: list[str]
    own_technologies: list[str]
    skills: list[str]
    technologies: list[str]
    points: int
    my_role: str | None = None
    members_limit: int
    members: list[MemberOut]
    created_at: datetime

    @field_serializer("created_at")
    def _serialize_created_at(self, value: datetime) -> str | None:
        return _utc_z(value)


class TeamResponse(ContractModel):
    team: TeamOut


class TeamSummary(ContractModel):
    id: int
    name: str
    my_role: str | None = None
    members_count: int
    members_limit: int
    skills: list[str]
    technologies: list[str]
    points: int


class TeamList(ContractModel):
    items: list[TeamSummary]


class TeamRequest(ContractModel):
    name: Any = ""
    interests: Any = None
    own_skills: Any = None
    own_technologies: Any = None


class MemberRequest(ContractModel):
    email: Any = ""


class StudentProfileRequest(ContractModel):
    name: Any = ""
    skills: Any = None
    technologies: Any = None
