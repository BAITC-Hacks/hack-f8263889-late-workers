"""The builder's `task` object — one shape every builder endpoint returns."""

from datetime import datetime
from typing import Any

from pydantic import field_serializer

from app.schemas.base import ContractModel
from app.schemas.task import CodeName, _utc_z


class Fragment(ContractModel):
    id: str
    text: str
    question_id: int | None = None


class RoundQuestionOut(ContractModel):
    id: int
    block: str
    text: str
    answer: str | None = None
    skipped: bool = False


class AssessmentEntry(ContractModel):
    block: str
    name: str
    quality: CodeName
    reason: str


class RoundOut(ContractModel):
    number: int
    mode: str
    assessment: list[AssessmentEntry]
    questions: list[RoundQuestionOut]
    created_at: datetime
    answered_at: datetime | None = None

    @field_serializer("created_at", "answered_at")
    def _serialize_times(self, value: datetime | None) -> str | None:
        return _utc_z(value)


class CardField(ContractModel):
    value: str | None = None
    source: str | None = None
    confirmed: bool = False
    sources: list[str] = []


class CardFields(ContractModel):
    context: CardField
    need: CardField
    target_users: CardField
    data_materials: CardField
    constraints: CardField
    expected_result: CardField
    success_criteria: CardField
    contact: CardField
    interaction_format: CardField


class Card(ContractModel):
    mode: str
    title: CardField
    fields: CardFields


class RatingEntry(ContractModel):
    block: str
    name: str
    quality: CodeName
    points: int
    max_points: int
    reason: str
    mode: str


class BuilderTask(ContractModel):
    id: int
    status: CodeName
    industry: CodeName
    draft_text: str | None = None
    rounds: list[RoundOut]
    rounds_left: int
    fragments: list[Fragment]
    card: Card | None = None
    badges: list[CodeName] = []
    rating: int | None = None
    level: CodeName | None = None
    rating_breakdown: list[RatingEntry] | None = None
    confirmed_at: datetime | None = None
    published_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    @field_serializer("confirmed_at", "published_at", "created_at", "updated_at")
    def _serialize_times(self, value: datetime | None) -> str | None:
        return _utc_z(value)


class BuilderTaskResponse(ContractModel):
    task: BuilderTask


class CreateDraftRequest(ContractModel):
    draft_text: Any = ""
    industry_code: Any = ""


class AnswerIn(ContractModel):
    question_id: Any = None
    answer: Any = None


class AnswersRequest(ContractModel):
    answers: list[AnswerIn] = []


class CardFieldsIn(ContractModel):
    context: Any = None
    need: Any = None
    target_users: Any = None
    data_materials: Any = None
    constraints: Any = None
    expected_result: Any = None
    success_criteria: Any = None
    contact: Any = None
    interaction_format: Any = None


class UpdateCardRequest(ContractModel):
    industry_code: Any = ""
    title: Any = ""
    fields: CardFieldsIn = CardFieldsIn()
