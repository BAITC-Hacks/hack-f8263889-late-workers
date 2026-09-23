"""Request and response schemas for the accounts contract (`/api/auth/*`)."""

from datetime import UTC, datetime
from typing import Any, Literal, Self

from pydantic import field_serializer, model_validator

from app.core import messages
from app.core.exceptions import ValidationError
from app.core.validation import (
    is_valid_password,
    normalize_email,
    normalize_phone,
    normalize_text,
    validate_tag_fields,
)
from app.schemas.base import ContractModel

Role = Literal["business", "student"]


class _Credentials(ContractModel):
    """Shared email/password half of both registration bodies.

    Every field defaults, on purpose: a missing field must reach our validator and
    get the contract's Russian message, instead of pydantic rejecting it first with
    its own English one.
    """

    email: Any = ""
    password: Any = ""

    def _validate_credentials(self, fields: dict[str, str]) -> None:
        email = normalize_email(self.email)
        if email is None:
            fields["email"] = messages.EMAIL_FORMAT
        else:
            self.email = email
        if not is_valid_password(self.password):
            fields["password"] = messages.PASSWORD_WEAK


class BusinessRegisterRequest(_Credentials):
    company_name: Any = ""
    contact_name: Any = ""
    contact_phone: Any = ""

    @model_validator(mode="after")
    def _validate(self) -> Self:
        fields: dict[str, str] = {}
        self._validate_credentials(fields)

        company_name = normalize_text(self.company_name, min_length=2, max_length=200)
        if company_name is None:
            fields["companyName"] = messages.COMPANY_NAME
        else:
            self.company_name = company_name

        contact_name = normalize_text(self.contact_name, min_length=2, max_length=100)
        if contact_name is None:
            fields["contactName"] = messages.CONTACT_NAME
        else:
            self.contact_name = contact_name

        contact_phone = normalize_phone(self.contact_phone)
        if contact_phone is None:
            fields["contactPhone"] = messages.CONTACT_PHONE
        else:
            self.contact_phone = contact_phone

        if fields:
            raise ValidationError(fields)
        return self


class StudentRegisterRequest(_Credentials):
    name: Any = ""
    skills: Any = None
    technologies: Any = None

    @model_validator(mode="after")
    def _validate(self) -> Self:
        fields: dict[str, str] = {}
        self._validate_credentials(fields)

        name = normalize_text(self.name, min_length=2, max_length=100)
        if name is None:
            fields["name"] = messages.NAME
        else:
            self.name = name

        validate_tag_fields(self, fields, {"skills": "skills", "technologies": "technologies"})

        if fields:
            raise ValidationError(fields)
        return self


class LoginRequest(ContractModel):
    email: Any = ""
    password: Any = ""

    @model_validator(mode="after")
    def _validate(self) -> Self:
        fields: dict[str, str] = {}
        # Only emptiness is checked here. Validating the format would lock out a
        # user whose stored address is odd but real.
        email = self.email.strip().lower() if isinstance(self.email, str) else ""
        if not email:
            fields["email"] = messages.EMAIL_REQUIRED
        else:
            self.email = email
        if not isinstance(self.password, str) or not self.password:
            fields["password"] = messages.PASSWORD_REQUIRED

        if fields:
            raise ValidationError(fields)
        return self


class BusinessProfileOut(ContractModel):
    id: int
    company_name: str
    contact_name: str
    contact_phone: str


class StudentProfileOut(ContractModel):
    id: int
    name: str
    skills: list[str]
    technologies: list[str]


class UserOut(ContractModel):
    id: int
    email: str
    role: Role
    created_at: datetime
    business: BusinessProfileOut | None = None
    student: StudentProfileOut | None = None

    @field_serializer("created_at")
    def _serialize_created_at(self, value: datetime) -> str:
        """The contract shows "2026-09-23T09:00:00Z".

        Postgres returns an aware timestamp, but a naive one (any driver without a
        timezone type) would serialise with no offset at all — which JavaScript then
        parses as *local* time. Normalising here keeps that out of the API.
        """
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.astimezone(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


class AuthResponse(ContractModel):
    user: UserOut
