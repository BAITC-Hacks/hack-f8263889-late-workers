# AGENTS.md

Guidance for coding agents (Codex, Claude Code, etc.) working in this repository.

## What this is

A FastAPI backend starter kit: async SQLAlchemy 2.0 + Postgres (SQLite supported), Alembic migrations, JWT auth, optional Redis rate limiting, and an OpenAI (Responses API) chat endpoint with SSE streaming. Python 3.12, dependencies managed by `uv`.

## Commands

```bash
uv sync                                   # install deps (creates .venv)
uv run uvicorn app.main:app --reload      # run API on :8000 (migrations run on startup)
uv run pytest -q                          # tests: Postgres in Docker, fake AI client, no network
uv run ruff check --fix . && uv run ruff format .   # lint + format (line length 100)
uv run alembic revision --autogenerate -m "msg"     # new migration after changing models
uv run alembic upgrade head               # apply migrations
```

Run `ruff` and `pytest` before finishing any task. Both must pass.

## Architecture

Request flow: `app/api/v1/*` (routers) → `app/services/*` (business logic) → `app/models/*` (SQLAlchemy) with `app/schemas/*` (Pydantic) at the boundary.

- `app/main.py` — app factory, lifespan (runs migrations, disposes engine/redis), middleware, router mounting.
- `app/core/config.py` — `Settings` (pydantic-settings), single `settings` instance. Add new env vars here.
- `app/core/exceptions.py` — `AppError` subclasses and handlers. Every error response is `{"error": {"code", "message"}}`, plus `fields` on a validation error.
- `app/core/security.py` — password hashing (pwdlib/bcrypt), JWT (PyJWT) and the auth cookie.
- `app/core/middleware.py` — pure-ASGI middleware: `X-Request-ID` + access log.
- `app/core/redis.py` — optional shared Redis client (`None` when `REDIS_URL` unset).
- `app/db/session.py` — engine, `SessionLocal`, `get_db` dependency.
- `app/api/deps.py` — `DbSession`, `OptionalUser`, `CurrentUser` annotated dependencies.
- `app/api/rate_limit.py` — `rate_limit(times, seconds, scope)` dependency factory (no-op without Redis).
- `app/services/ai.py` — the only module that talks to the AI provider.

## The accounts contract (`/api/auth/*`)

Two API surfaces live side by side:

- **`/api/auth/*`** — the accounts contract the frontend codes against. Unversioned,
  camelCase on the wire, authenticated by an HttpOnly cookie. Files: `app/api/auth.py`,
  `app/services/accounts.py`, `app/schemas/account.py`, `app/core/validation.py`,
  `app/core/messages.py`.
- **`/api/v1/*`** — the starter kit's own resources (notes, ai) plus a form login that
  backs Swagger's Authorize button. snake_case, bearer token. Tagged `legacy`.

Rules for anything new on `/api`:

- Schemas subclass `ContractModel` (`app/schemas/base.py`) — camelCase aliases, snake_case
  in Python. `/api/v1` schemas stay on plain `BaseModel`.
- Error codes are `SCREAMING_SNAKE` everywhere, app-wide. Validation errors carry a flat
  `fields` map (`{field: russian message}`); nothing else does. User-facing strings live in
  `app/core/messages.py`.
- Guard role-specific endpoints with `require_role("business")` / `BusinessUser` from
  `app/api/deps.py`. It reads `user.role` from the database, never the token's claim.
- `get_optional_user` accepts the cookie first and an `Authorization` header second, so a
  cookie session and a bearer token are interchangeable.

Deliberate deviations from the written spec, so nobody "fixes" them later:

1. The JWT `sub` is `str(user.id)`, not an int — PyJWT refuses to decode an integer `sub`.
2. The column stays `users.hashed_password`; the spec calls it `password_hash`. It is never
   exposed, so renaming it would only churn the initial migration.
3. `JWT_SECRET` is an alias for `SECRET_KEY` rather than a second secret.
4. Profile tables carry `created_at`/`updated_at` from `TimestampMixin`, which the spec's
   column list does not mention. They are invisible to the API.

Passwords are bcrypt cost 10 (spec), with argon2 kept second in the chain so hashes written
before the switch still verify.

## The card builder (`/api/business/tasks/*`)

A business writes a free-form draft; AI grades it across seven blocks, asks 3-5
questions (up to 3 rounds), assembles a card strictly from what was said, the
business edits and confirms it, and the task is rated 0-100 and published.

- `app/core/blocks.py` — the seven blocks, their weights (they sum to 100) and the
  quality scale. Everything else reads from here.
- `app/services/ai_client.py` — the only place structured AI calls happen. It owns
  the Redis cache, the hourly per-business limit, the `ai_calls` journal and the one
  revalidation retry. Every failure raises `AIUnavailable`, which is an internal
  signal to fall back — it must never reach the HTTP layer.
- `app/services/fallback.py` — the offline half: the question bank, verbatim card
  assembly, and the heuristic grader. The whole flow must work with no API key.
- `app/services/rating.py` — blocks whose `textHash` is unchanged reuse their previous
  assessment, so re-confirming an unedited card neither calls the model nor moves the
  rating. `round_half_up` exists because Python's `round()` is banker's rounding.

Three things that will bite if forgotten:

1. Structured Outputs are `responses.parse(text_format=Model)`, and **strict schemas
   reject open maps** — use explicit fields, never `dict[str, ...]`.
2. `responses.parse` raises nothing on a refusal or a truncated answer; check the
   output items, `status`, and `output_parsed is None` yourself.
3. After a write, re-select the task with `populate_existing` instead of
   `db.refresh` — refresh expires the relationships and the next attribute access
   lazy-loads in the async path and raises `MissingGreenlet`.

Run `uv run python scripts/check_openai.py` to verify the key and model.

## Teams and proposals (`/api/teams`, `/api/proposals`)

Students form teams of up to five; the captain sends a proposal to a task from the
catalogue. `app/services/teams.py` and `app/services/proposals.py` hold the logic,
`app/api/teams.py` the routes (the proposal routes that hang off a task live on the
catalogue's `tasks_router`).

- `tasks.responses_count` is **recomputed**, never incremented:
  `recalc_responses_count` counts every proposal that was not withdrawn, and runs on
  send, on withdraw, and at the end of the seed.
- Three constraints are index expressions, not `unique=True`: case-insensitive team
  names, one captain per team, and one live proposal per (task, team). The last one
  is partial — that is what lets a team apply again after withdrawing.
  In a model index, write `text("lower(name)")`: `func.lower("name")` indexes the
  literal string, not the column, and only `create_all` would show it.
- Visibility: a student outside a team gets **404** for it, not 403, so team and
  proposal ids cannot be probed; a member who is not the captain gets 403 on writes.
  `GET /api/teams/{id}` is the one endpoint open to businesses, and it hides member
  emails from everyone outside the team.

Tag handling is shared, not copied: `dedupe_tags` and `validate_tag_fields` in
`app/core/validation.py` back registration, the student profile and team tags alike.

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

Tests run against **Postgres in Docker**, the same engine production uses — `make infra`
must be up, and `make test` creates the `app_test` database first. The schema is built once
per session and every test starts from a `TRUNCATE ... RESTART IDENTITY`, so ids begin at 1
and tests can assert the contract's examples literally.

- Fixtures in `tests/conftest.py`: `client` (httpx over ASGI, carries its own cookie jar),
  `client_factory` (a second independent client — needed whenever one test wants two
  sessions), `db` (direct session, for assertions HTTP can't make), `raising_client` (turns
  an unhandled exception into a 500 response), `business` / `student` (registered accounts),
  `auth_headers` (a bearer header lifted out of the auth cookie), `fake_ai`.
- `tests/test_migrations.py` runs Alembic against throwaway databases, including one that
  already has rows — the only place that would catch a model/migration drift, since every
  other test builds the schema with `create_all`.
- Tests never hit the network. If a test needs Redis, override `get_redis` with a fake
  (see `tests/test_rate_limit.py`).
- `tests/conftest.py` sets env vars before importing the app; keep that ordering.

## AI endpoint notes

- `app/services/ai.py` calls `await client.responses.create(..., stream=True)` once and both endpoints consume the same event stream (`response.output_text.delta`, `response.refusal.delta`, `response.completed|incomplete|failed`, `error`). Model, max output tokens, reasoning effort and system prompt come from settings.
- Conversation history is passed as `input=[{"role", "content"}, ...]`, the system prompt as `instructions`.
- Outcomes: `completed` → normal; `incomplete` with `max_output_tokens` → returned with that `stop_reason`; refusal text or `content_filter` → error code `AI_REFUSAL` (HTTP 422 / SSE `error`); `failed` or an `error` event → `UPSTREAM_ERROR` (502).
- SSE event contract: `delta` → `{"text"}`, `done` → `{"model","stop_reason","usage"}`, `error` → `{"code","message", ...details}`.
- Tests build events with `tests/fakes.py` helpers (`text_events`, `fake_event`, `fake_response`); never call the real API in tests.

## Don'ts

- Don't commit `.env`, `*.db`, or `.venv`.
- Don't add `HTTPException` with ad-hoc bodies; use `AppError` subclasses so the error shape stays consistent.
- Don't put OpenAI SDK calls outside `app/services/ai.py`.
- Don't weaken `SECRET_KEY` checks or disable `AUTO_MIGRATE` in tests/CI without reason.
