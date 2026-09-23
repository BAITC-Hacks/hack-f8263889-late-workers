# AGENTS.md

Guidance for coding agents (Codex, Claude Code, etc.) working in this repository.

## What this is

A FastAPI backend starter kit: async SQLAlchemy 2.0 + Postgres (SQLite supported), Alembic migrations, JWT auth, optional Redis rate limiting, and an OpenAI (Responses API) chat endpoint with SSE streaming. Python 3.12, dependencies managed by `uv`.

## Commands

```bash
uv sync                                   # install deps (creates .venv)
uv run uvicorn app.main:app --reload      # run API on :8000 (migrations run on startup)
uv run pytest -q                          # tests: in-memory SQLite, fake AI client, no network
uv run ruff check --fix . && uv run ruff format .   # lint + format (line length 100)
uv run alembic revision --autogenerate -m "msg"     # new migration after changing models
uv run alembic upgrade head               # apply migrations
```

Run `ruff` and `pytest` before finishing any task. Both must pass.

## Architecture

Request flow: `app/api/v1/*` (routers) → `app/services/*` (business logic) → `app/models/*` (SQLAlchemy) with `app/schemas/*` (Pydantic) at the boundary.

- `app/main.py` — app factory, lifespan (runs migrations, disposes engine/redis), middleware, router mounting.
- `app/core/config.py` — `Settings` (pydantic-settings), single `settings` instance. Add new env vars here.
- `app/core/exceptions.py` — `AppError` subclasses and handlers. Every error response is `{"error": {"code", "message", "details"}}`.
- `app/core/security.py` — password hashing (pwdlib/argon2) and JWT (PyJWT).
- `app/core/middleware.py` — pure-ASGI middleware: `X-Request-ID` + access log.
- `app/core/redis.py` — optional shared Redis client (`None` when `REDIS_URL` unset).
- `app/db/session.py` — engine, `SessionLocal`, `get_db` dependency.
- `app/api/deps.py` — `DbSession`, `OptionalUser`, `CurrentUser` annotated dependencies.
- `app/api/rate_limit.py` — `rate_limit(times, seconds, scope)` dependency factory (no-op without Redis).
- `app/services/ai.py` — the only module that talks to the AI provider.

## Conventions

- Routers are thin: parse input, call a service, return. No SQL in routers.
- Services take `db: AsyncSession` as the first argument and commit themselves. Raise `NotFoundError`, `ConflictError`, `ForbiddenError`, `UnauthorizedError` from `app.core.exceptions` instead of `HTTPException`.
- Every resource is owner-scoped: query by `owner_id == user.id`; a foreign object is a 404, not a 403.
- Read schemas use `model_config = ConfigDict(from_attributes=True)`. Update schemas use optional fields + `model_dump(exclude_unset=True)`.
- List endpoints return `Page[T]` from `app/schemas/common.py` with `limit`/`offset` query params.
- New models must be imported in `app/models/__init__.py` (Alembic autogenerate depends on it).
- Schema changes always go through an Alembic migration. Never call `Base.metadata.create_all` in app code (tests do it for speed).
- Type hints everywhere; `ruff` config lives in `pyproject.toml`.

## Adding a resource (copy the `notes` example)

1. `app/models/<name>.py` + import in `app/models/__init__.py`
2. `app/schemas/<name>.py`
3. `app/services/<name>.py`
4. `app/api/v1/<name>.py` + `include_router` in `app/api/router.py`
5. `uv run alembic revision --autogenerate -m "add <name>"`, review the file, `uv run alembic upgrade head`
6. Tests in `tests/test_<name>.py` using the `client` and `auth_headers` fixtures

## Testing

- Fixtures in `tests/conftest.py`: `client` (httpx over ASGI, fresh in-memory SQLite per test), `auth_headers` (registers + logs in a user), `fake_ai` (installs a fake OpenAI client; see `tests/fakes.py`).
- Tests never hit the network or a real database server. If a test needs Redis, override `get_redis` with a fake (see `tests/test_rate_limit.py`).
- `tests/conftest.py` sets env vars before importing the app; keep that ordering.

## AI endpoint notes

- `app/services/ai.py` calls `await client.responses.create(..., stream=True)` once and both endpoints consume the same event stream (`response.output_text.delta`, `response.refusal.delta`, `response.completed|incomplete|failed`, `error`). Model, max output tokens, reasoning effort and system prompt come from settings.
- Conversation history is passed as `input=[{"role", "content"}, ...]`, the system prompt as `instructions`.
- Outcomes: `completed` → normal; `incomplete` with `max_output_tokens` → returned with that `stop_reason`; refusal text or `content_filter` → error code `ai_refusal` (HTTP 422 / SSE `error`); `failed` or an `error` event → `upstream_error` (502).
- SSE event contract: `delta` → `{"text"}`, `done` → `{"model","stop_reason","usage"}`, `error` → `{"code","message", ...details}`.
- Tests build events with `tests/fakes.py` helpers (`text_events`, `fake_event`, `fake_response`); never call the real API in tests.

## Don'ts

- Don't commit `.env`, `*.db`, or `.venv`.
- Don't add `HTTPException` with ad-hoc bodies; use `AppError` subclasses so the error shape stays consistent.
- Don't put OpenAI SDK calls outside `app/services/ai.py`.
- Don't weaken `SECRET_KEY` checks or disable `AUTO_MIGRATE` in tests/CI without reason.
