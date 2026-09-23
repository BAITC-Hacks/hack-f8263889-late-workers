"""Application errors and handlers that produce one consistent JSON error shape.

Every error response looks like:
    {"error": {"code": "NOT_FOUND", "message": "Note not found"}}

`fields` is added for validation errors only — a flat {field: message} map the
frontend can drop straight into a form:
    {"error": {"code": "VALIDATION_ERROR", "message": "...", "fields": {"email": "..."}}}
"""

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core import messages
from app.core.config import settings

logger = logging.getLogger(__name__)

# `loc` entries that name the request part, not the field the user filled in.
_LOC_PREFIXES = {"body", "query", "path", "header", "cookie"}


class AppError(Exception):
    status_code: int = 400
    code: str = "BAD_REQUEST"

    def __init__(
        self,
        message: str,
        *,
        status_code: int | None = None,
        code: str | None = None,
        details: Any = None,
        fields: dict[str, str] | None = None,
        extra: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        if code is not None:
            self.code = code
        self.details = details
        self.fields = fields
        self.extra = extra
        self.headers = headers


class NotFoundError(AppError):
    status_code = 404
    code = "NOT_FOUND"


class UnauthorizedError(AppError):
    status_code = 401
    code = "UNAUTHORIZED"

    def __init__(self, message: str = messages.UNAUTHORIZED, **kwargs: Any) -> None:
        kwargs.setdefault("headers", {"WWW-Authenticate": "Bearer"})
        super().__init__(message, **kwargs)


class ForbiddenError(AppError):
    status_code = 403
    code = "FORBIDDEN"

    def __init__(self, message: str = messages.FORBIDDEN, **kwargs: Any) -> None:
        super().__init__(message, **kwargs)


class ConflictError(AppError):
    status_code = 409
    code = "CONFLICT"


class RateLimitedError(AppError):
    status_code = 429
    code = "RATE_LIMITED"


class UpstreamError(AppError):
    """A third-party service (e.g. the AI provider) failed."""

    status_code = 502
    code = "UPSTREAM_ERROR"


class ValidationError(AppError):
    """Every failing field at once, each with the message the contract specifies."""

    status_code = 422
    code = "VALIDATION_ERROR"

    def __init__(
        self, fields: dict[str, str], message: str = messages.VALIDATION, **kwargs: Any
    ) -> None:
        super().__init__(message, fields=fields, **kwargs)


class InvalidStatusError(ConflictError):
    code = "INVALID_STATUS"

    def __init__(self, message: str = messages.INVALID_STATUS, **kwargs: Any) -> None:
        super().__init__(message, **kwargs)


class RoundLimitReachedError(ConflictError):
    code = "ROUND_LIMIT_REACHED"

    def __init__(self, message: str = messages.ROUND_LIMIT_REACHED, **kwargs: Any) -> None:
        super().__init__(message, **kwargs)


class RoundNotAnsweredError(ConflictError):
    code = "ROUND_NOT_ANSWERED"

    def __init__(self, message: str = messages.ROUND_NOT_ANSWERED, **kwargs: Any) -> None:
        super().__init__(message, **kwargs)


class CardNotConfirmedError(ConflictError):
    code = "CARD_NOT_CONFIRMED"

    def __init__(self, message: str = messages.CARD_NOT_CONFIRMED, **kwargs: Any) -> None:
        super().__init__(message, **kwargs)


class TeamFullError(ConflictError):
    code = "TEAM_FULL"

    def __init__(self, message: str = messages.TEAM_FULL, **kwargs: Any) -> None:
        super().__init__(message, **kwargs)


class CaptainCannotLeaveError(ConflictError):
    code = "CAPTAIN_CANNOT_LEAVE"

    def __init__(self, message: str = messages.CAPTAIN_CANNOT_LEAVE, **kwargs: Any) -> None:
        super().__init__(message, **kwargs)


class ProposalExistsError(ConflictError):
    """Carries the id of the proposal that is already in the way."""

    code = "PROPOSAL_EXISTS"

    def __init__(self, proposal_id: int, **kwargs: Any) -> None:
        super().__init__(messages.PROPOSAL_EXISTS, extra={"proposalId": proposal_id}, **kwargs)


class AlreadyConfirmedError(ConflictError):
    code = "ALREADY_CONFIRMED"

    def __init__(self, message: str = messages.ALREADY_CONFIRMED, **kwargs: Any) -> None:
        super().__init__(message, **kwargs)


class EmailTakenError(ConflictError):
    code = "EMAIL_TAKEN"

    def __init__(self, message: str = messages.EMAIL_TAKEN, **kwargs: Any) -> None:
        super().__init__(message, **kwargs)


class InvalidCredentialsError(UnauthorizedError):
    code = "INVALID_CREDENTIALS"

    def __init__(self, message: str = messages.INVALID_CREDENTIALS, **kwargs: Any) -> None:
        super().__init__(message, **kwargs)


def error_response(
    status_code: int,
    code: str,
    message: str,
    details: Any = None,
    fields: dict[str, str] | None = None,
    extra: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    body: dict[str, Any] = {"error": {"code": code, "message": message}}
    # Contract-specific siblings of code/message, e.g. PROPOSAL_EXISTS carries proposalId.
    if extra:
        body["error"].update(extra)
    if fields is not None:
        body["error"]["fields"] = fields
    if details is not None:
        body["error"]["details"] = jsonable_encoder(details)
    return JSONResponse(status_code=status_code, content=body, headers=headers)


def fields_from_request_errors(exc: RequestValidationError) -> dict[str, str] | None:
    """Flatten pydantic's error list into {field: message}.

    Safety net only: request schemas default every field, so their own validators
    report the contract's messages first. This catches what pydantic rejects before
    them — a body that is not a JSON object, or a bad query parameter. Such an error
    has `loc == ("body",)` with no field name, hence the emptiness check.
    """
    fields: dict[str, str] = {}
    for err in exc.errors():
        loc = [str(part) for part in err.get("loc", ()) if part not in _LOC_PREFIXES]
        if loc:
            fields.setdefault(".".join(loc), err.get("msg", messages.VALIDATION))
    return fields or None


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError) -> JSONResponse:
        return error_response(
            exc.status_code,
            exc.code,
            exc.message,
            details=exc.details,
            fields=exc.fields,
            extra=exc.extra,
            headers=exc.headers,
        )

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        return error_response(
            422, "VALIDATION_ERROR", messages.VALIDATION, fields=fields_from_request_errors(exc)
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = {401: "UNAUTHORIZED", 403: "FORBIDDEN", 404: "NOT_FOUND", 405: "METHOD_NOT_ALLOWED"}
        return error_response(
            exc.status_code,
            code.get(exc.status_code, "HTTP_ERROR"),
            str(exc.detail),
            headers=exc.headers,
        )

    @app.exception_handler(Exception)
    async def _unhandled(_: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled error: %s", exc)
        message = f"{type(exc).__name__}: {exc}" if settings.DEBUG else "Internal server error"
        return error_response(500, "INTERNAL_ERROR", message)
