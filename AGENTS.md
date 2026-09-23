# AGENTS.md

Guidance for coding agents (Codex, Claude Code, etc.) working in this repository.

## What this is

A monorepo with two apps:

| Dir | What | Port | Docs |
|---|---|---|---|
| `backend/` | FastAPI + async SQLAlchemy + Alembic + JWT + optional Redis + OpenAI (SSE) | 8000 | [`backend/AGENTS.md`](backend/AGENTS.md) |
| `frontend/` | Vite + React 19 + TypeScript + Tailwind 4 + TanStack Query + zustand + i18next | 5173 | [`frontend/AGENTS.md`](frontend/AGENTS.md) |

Each app's `AGENTS.md` is the source of truth for its architecture, conventions, and commands — open the relevant one before making changes there. This file only covers what's shared at the repo root.

## Commands (whole stack, from repo root)

```bash
make docker-up      # full stack in Docker: Postgres + Redis + API + web, hot reload
make docker-down     # stop (data kept); make docker-reset stops + drops the DB volume
make setup            # local dev: uv sync (backend) + yarn install (frontend), .env files created
make infra              # Postgres + Redis only, in Docker — for local dev against real infra
make dev                  # API (:8000) + web (:5173) together, locally, Ctrl+C stops both
make backend / make frontend   # run one side only
make test                        # backend pytest
make lint                         # backend ruff + frontend eslint/tsc
```

See root `README.md` for the full quick-start walkthrough (in Russian) and DB connection details for external tools.

## Commit messages

Write commit messages in English, using [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <summary>`, imperative mood, summary lowercase and under ~72 chars.

- Common types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `build`, `ci`.
- Scope is optional; when used, prefer `backend`/`frontend`/a module or app name, e.g. `feat(notes): add pagination`.
- Breaking change → `!` after the type/scope (`feat(auth)!: ...`) plus a `BREAKING CHANGE:` footer explaining it.
