"""Response schemas for the task catalogue (`/api/tasks`, `/api/industries`, …)."""

from datetime import UTC, datetime

from pydantic import field_serializer

from app.schemas.base import ContractModel


def _utc_z(value: datetime | None) -> str | None:
    """ISO 8601 UTC with a Z suffix, matching the accounts contract."""
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


class CodeName(ContractModel):
    """A reference value: industry, level or status."""

    code: str
    name: str


class IndustryList(ContractModel):
    items: list[CodeName]


class TaskCard(ContractModel):
    id: int
    title: str
    company_name: str
    industry: CodeName
    rating: int
    level: CodeName
    status: CodeName
    need_excerpt: str
    responses_count: int
    published_at: datetime | None = None
    is_saved: bool = False

    @field_serializer("published_at")
    def _serialize_published_at(self, value: datetime | None) -> str | None:
        return _utc_z(value)


class TaskFields(ContractModel):
    """The task's prose. Any of these may be empty while a task is a draft."""

    context: str | None = None
    need: str | None = None
    target_users: str | None = None
    data_materials: str | None = None
    constraints: str | None = None
    expected_result: str | None = None
    success_criteria: str | None = None
    contact: str | None = None
    interaction_format: str | None = None


class TaskDetail(ContractModel):
    id: int
    title: str
    company_name: str
    industry: CodeName
    rating: int
    level: CodeName
    status: CodeName
    responses_count: int
    published_at: datetime | None = None
    is_saved: bool = False
    is_owner: bool = False
    fields: TaskFields

    @field_serializer("published_at")
    def _serialize_published_at(self, value: datetime | None) -> str | None:
        return _utc_z(value)


class TaskDetailResponse(ContractModel):
    task: TaskDetail


class TaskPage(ContractModel):
    """The catalogue envelope: page/pageSize, not the limit/offset `Page[T]`."""

    items: list[TaskCard]
    page: int
    page_size: int
    total: int


class TaskList(ContractModel):
    """Saved tasks and business tasks come back unpaginated."""

    items: list[TaskCard]


class BusinessTaskCard(ContractModel):
    id: int
    title: str
    status: CodeName
    rating: int
    level: CodeName
    responses_count: int
    updated_at: datetime

    @field_serializer("updated_at")
    def _serialize_updated_at(self, value: datetime) -> str:
        return _utc_z(value) or ""


class BusinessTaskList(ContractModel):
    items: list[BusinessTaskCard]
