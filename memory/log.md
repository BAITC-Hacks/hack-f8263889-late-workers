# Log

## 2026-09-20 — backend template, frontend API core, auth/notes/ai modules, Docker
- Dropped `FastApi_Starter_kit` into `backend/`; fixed a template config bug (stale `REDIS_URL` leaking into tests). `make setup && make lint && make test` green.
- Built frontend API core (`frontend/src/core/api/`): axios client, JWT via `tokenStorage`, errors normalized to the backend's `{"error": {...}}` shape, SSE streaming for AI chat.
- Shipped `auth`, `notes`, `ai` modules end-to-end (routes, TopBar, i18n), browser-tested; multi-agent code review fixed cache/UX edge cases. tsc/eslint/build clean.
- Fixed `make dev` clashing with a pre-existing local Postgres: added `make docker-up` (full Docker stack) and made local `make dev` default to SQLite.
— d
