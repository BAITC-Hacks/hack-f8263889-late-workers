# Log

## 2026-09-23 — frontend: teams and proposals
- New modules `teams` and `proposals` on the real FastAPI endpoints: my teams, create/edit team, members (add by email, remove, leave), proposals block on the task page, create/edit proposal form, my proposals with team filter and withdraw. Student profile page in `auth`.
- Student nav: «Команды», «Мои отклики»; the name links to `/student/profile`; `/student` link uses `end`.
- Shared primitives moved to `common`: `FormField`, `FormError`, `TextareaField`, `PendingButton`, `ErrorState`, new `ConfirmDialog`; `common/lib/{query,forms}.ts`. `ApiError.proposalId` for `PROPOSAL_EXISTS`.
- Mock stubs for `/api/teams/my` and `/api/tasks/:id/my-proposals` only. lint/typecheck/build green; Playwright not run (browser not installed).
— c

## 2026-09-20 — backend template, frontend API core, auth/notes/ai modules, Docker
- Dropped `FastApi_Starter_kit` into `backend/`; fixed a template config bug (stale `REDIS_URL` leaking into tests). `make setup && make lint && make test` green.
- Built frontend API core (`frontend/src/core/api/`): axios client, JWT via `tokenStorage`, errors normalized to the backend's `{"error": {...}}` shape, SSE streaming for AI chat.
- Shipped `auth`, `notes`, `ai` modules end-to-end (routes, TopBar, i18n), browser-tested; multi-agent code review fixed cache/UX edge cases. tsc/eslint/build clean.
- Fixed `make dev` clashing with a pre-existing local Postgres: added `make docker-up` (full Docker stack) and made local `make dev` default to SQLite.
— d
