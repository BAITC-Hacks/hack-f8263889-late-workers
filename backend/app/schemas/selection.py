"""Schemas for the business's side of proposals: selection and milestones."""

from datetime import datetime
from typing import Any

from pydantic import field_serializer

from app.schemas.base import ContractModel
from app.schemas.task import CodeName, _utc_z


class MilestoneOut(ContractModel):
    id: int
    title: str
    confirmed: bool
    points: int
    created_at: datetime
    confirmed_at: datetime | None = None

    @field_serializer("created_at", "confirmed_at")
    def _serialize_times(self, value: datetime | None) -> str | None:
        return _utc_z(value)


class BusinessProposalTeam(ContractModel):
    """summarize_team minus myRole/membersLimit — extra dict keys are dropped."""

    id: int
    name: str
    members_count: int
    skills: list[str]
    technologies: list[str]
    points: int


class BusinessProposalOut(ContractModel):
    id: int
    status: CodeName
    team: BusinessProposalTeam
    idea: str
    plan: str
    duration_weeks: int
    prototype_url: str | None = None
    business_comment: str | None = None
    milestones: list[MilestoneOut]
    created_at: datetime
    updated_at: datetime
    decided_at: datetime | None = None

    @field_serializer("created_at", "updated_at", "decided_at")
    def _serialize_times(self, value: datetime | None) -> str | None:
        return _utc_z(value)


class BusinessTaskPreview(ContractModel):
    id: int
    title: str
    status: CodeName
    rating: int
    level: CodeName


class BusinessProposalsPage(ContractModel):
    task: BusinessTaskPreview
    items: list[BusinessProposalOut]


class BusinessProposalResponse(ContractModel):
    proposal: BusinessProposalOut


class DecisionResponse(ContractModel):
    proposal: BusinessProposalOut
    task_status: CodeName


class DecisionRequest(ContractModel):
    comment: Any = None


class MilestoneRequest(ContractModel):
    title: Any = ""


class MarketSinceUpdate(ContractModel):
    since: datetime
    views: int
    responses: int

    @field_serializer("since")
    def _serialize_since(self, value: datetime) -> str | None:
        return _utc_z(value)


class MarketHint(ContractModel):
    block: str
    name: str


class MarketOut(ContractModel):
    views: int
    saves: int
    responses: int
    conversion: int | None = None
    industry_median_responses: float | int | None = None
    industry_median_conversion: float | int | None = None
    since_update: MarketSinceUpdate | None = None
    hint: MarketHint | None = None


class MarketResponse(ContractModel):
    market: MarketOut
