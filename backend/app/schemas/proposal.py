"""Proposal schemas."""

from datetime import datetime
from typing import Any

from pydantic import field_serializer

from app.schemas.base import ContractModel
from app.schemas.selection import MilestoneOut
from app.schemas.task import CodeName, _utc_z


class ProposalTask(ContractModel):
    id: int
    title: str
    company_name: str
    rating: int
    level: CodeName


class ProposalTeam(ContractModel):
    id: int
    name: str


class ProposalAuthor(ContractModel):
    student_id: int
    name: str


class ProposalOut(ContractModel):
    id: int
    task: ProposalTask
    team: ProposalTeam
    author: ProposalAuthor
    status: CodeName
    idea: str
    plan: str
    duration_weeks: int
    prototype_url: str | None = None
    business_comment: str | None = None
    can_edit: bool
    milestones: list[MilestoneOut]
    created_at: datetime
    updated_at: datetime
    decided_at: datetime | None = None

    @field_serializer("created_at", "updated_at", "decided_at")
    def _serialize_times(self, value: datetime | None) -> str | None:
        return _utc_z(value)


class ProposalResponse(ContractModel):
    proposal: ProposalOut


class ProposalList(ContractModel):
    items: list[ProposalOut]


class ProposalRequest(ContractModel):
    team_id: Any = None
    idea: Any = ""
    plan: Any = ""
    duration_weeks: Any = None
    prototype_url: Any = None


class ProposalUpdateRequest(ContractModel):
    idea: Any = ""
    plan: Any = ""
    duration_weeks: Any = None
    prototype_url: Any = None
