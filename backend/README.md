# FastAPI Starter Kit

Готовый бэкенд‑каркас: FastAPI + SQLAlchemy 2.0 (async) + Postgres + Alembic + JWT‑аутентификация + опциональный Redis + интеграция с OpenAI (обычный ответ и стриминг через SSE). Клонируй, заполни `.env`, запусти — и пиши бизнес‑логику.

## Что внутри

- **Слои**: `api` (роутеры) → `services` (логика) → `models` (SQLAlchemy) + `schemas` (Pydantic).
- **Аутентификация**: регистрация, логин (форма для кнопки *Authorize* в Swagger и JSON для фронтенда), JWT, `/users/me`.
- **Пример ресурса** `notes` с CRUD и пагинацией — шаблон для копирования.
- **AI**: `POST /ai/chat` и `POST /ai/chat/stream` (Server‑Sent Events) на OpenAI Responses API, с обработкой отказов, обрезки по токенам и ошибок провайдера.
- **БД**: Postgres по умолчанию, SQLite одной переменной. Миграции Alembic применяются автоматически при старте.
- **Redis (опционально)**: rate‑limit на AI‑эндпоинты (по пользователю или IP). Без `REDIS_URL` всё работает, лимит просто выключен.
- **Инфраструктура**: единый формат ошибок, `X-Request-ID` в ответах и логах, CORS, health‑check, Docker + docker‑compose, Makefile, тесты без сети.

## Быстрый старт

Нужен только [uv](https://docs.astral.sh/uv/) — по умолчанию база SQLite, Redis выключен.

```bash
make setup          # uv sync + копирует .env.example → .env
make dev            # http://localhost:8000/docs
```

Postgres + Redis (нужен Docker): `make infra`, затем в `.env` раскомментируй `DATABASE_URL=postgresql+asyncpg://...` и `REDIS_URL=...`.

Чтобы работал AI, впиши `OPENAI_API_KEY` в `.env`.

## Команды

| Команда | Что делает |
|---|---|
| `make dev` | API с автоперезагрузкой на порту 8000 |
| `make test` | pytest (SQLite в памяти, AI‑клиент замокан, сеть не нужна) |
| `make lint` / `make fmt` | ruff проверка / автоисправление |
| `make migrate` | `alembic upgrade head` |
| `make migration m="add tags"` | автогенерация миграции по моделям |
| `make docker-up` | весь стек (api + db + redis) в Docker |

## Эндпоинты

| Метод | Путь | Описание |
|---|---|---|
| GET | `/health` | статус API, БД и Redis |
| POST | `/api/v1/auth/register` | регистрация |
| POST | `/api/v1/auth/login` | логин формой (`username`, `password`) — для Swagger |
| POST | `/api/v1/auth/login/json` | логин JSON (`email`, `password`) — для фронтенда |
| GET | `/api/v1/users/me` | текущий пользователь |
| GET/POST | `/api/v1/notes` | список с пагинацией / создание |
| GET/PATCH/DELETE | `/api/v1/notes/{id}` | получить / обновить / удалить |
| POST | `/api/v1/ai/chat` | ответ модели целиком |
| POST | `/api/v1/ai/chat/stream` | ответ модели потоком (SSE) |

Все защищённые эндпоинты ждут заголовок `Authorization: Bearer <token>`. В Swagger нажми **Authorize**, введи email в поле username и пароль — токен подставится автоматически.

### Формат ошибок

```json
{"error": {"code": "not_found", "message": "Note not found", "details": null}}
```

Коды: `validation_error` (422), `unauthorized` (401), `forbidden` (403), `not_found` (404), `conflict` (409), `rate_limited` (429), `ai_refusal` (422), `upstream_error` (502), `internal_error` (500).

## AI

Запрос одинаковый для обоих эндпоинтов:

```json
{
  "messages": [{"role": "user", "content": "Привет!"}],
  "system": "необязательно, перекрывает AI_SYSTEM_PROMPT",
  "max_tokens": 1024
}
```

Стриминг отдаёт события `delta` (кусочки текста), затем `done` (модель, stop_reason, usage) или `error`:

```
event: delta
data: {"text": "Прив"}

event: done
data: {"model": "gpt-5.5", "stop_reason": "completed", "usage": {"input_tokens": 12, "output_tokens": 8}}
```

Так как это POST, в браузере читай поток через `fetch` + `ReadableStream`, а не `EventSource`.

`stop_reason` бывает `completed`, `max_output_tokens` (ответ обрезан, увеличь `max_tokens`) и другие статусы провайдера. Отказ модели или срабатывание контент‑фильтра приходит как ошибка `ai_refusal` (HTTP 422 или событие `error`).

Модель, лимит токенов, reasoning effort и системный промпт настраиваются через `.env`. Вся работа с провайдером изолирована в `app/services/ai.py` — чтобы сменить провайдера, замени только этот файл.

## Как добавить свой ресурс

На примере `notes`:

1. `app/models/<name>.py` — таблица; добавь импорт в `app/models/__init__.py`.
2. `app/schemas/<name>.py` — `Create`, `Update`, `Read` (у `Read` — `from_attributes=True`).
3. `app/services/<name>.py` — функции с `db: AsyncSession` первым аргументом; коммит внутри сервиса.
4. `app/api/v1/<name>.py` — роутер; подключи его в `app/api/router.py`.
5. `make migration m="add <name>"` → проверь файл в `alembic/versions/` → `make migrate` (или просто перезапусти `make dev`).

Ошибки бросай через `NotFoundError`, `ConflictError`, `ForbiddenError` из `app/core/exceptions.py` — они сами превратятся в правильный JSON.

## Структура

```
app/
  main.py            # фабрика приложения, lifespan, middleware, роутеры
  core/              # config, logging, security (JWT/пароли), exceptions, middleware, redis
  db/                # Base, engine/session, запуск миграций
  models/            # SQLAlchemy‑модели
  schemas/           # Pydantic‑схемы
  services/          # бизнес‑логика (auth, users, notes, ai)
  api/               # deps (get_db, CurrentUser), rate_limit, router, v1/*
alembic/             # миграции
tests/               # pytest; fakes.py — фейковый OpenAI‑клиент
```

## Переменные окружения

См. `.env.example`. Главные:

| Переменная | По умолчанию | Описание |
|---|---|---|
| `DATABASE_URL` | Postgres на localhost | `postgresql+asyncpg://…` или `sqlite+aiosqlite:///./app.db` |
| `AUTO_MIGRATE` | `true` | применять миграции при старте |
| `REDIS_URL` | — | включает rate‑limit, если задан |
| `AI_RATE_LIMIT_PER_MINUTE` | `20` | запросов к `/ai/*` в минуту на пользователя |
| `SECRET_KEY` | placeholder | `openssl rand -hex 32`; в `ENV=prod` placeholder запрещён |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | время жизни JWT |
| `CORS_ORIGINS` | localhost:3000, :5173 | список через запятую |
| `OPENAI_API_KEY` | — | ключ OpenAI |
| `OPENAI_BASE_URL` | — | прокси или совместимый endpoint, если выдали |
| `OPENAI_MODEL` | `gpt-5.5` | модель; для скорости/дешевизны `gpt-5.4-mini` |
| `OPENAI_MAX_OUTPUT_TOKENS` | `4096` | лимит ответа по умолчанию |
| `OPENAI_REASONING_EFFORT` | — | `none` … `max`; не задан = дефолт провайдера |

## Продакшен

- `ENV=prod`, сильный `SECRET_KEY`, точный `CORS_ORIGINS`.
- `AUTO_MIGRATE=false` и запускай `alembic upgrade head` отдельным шагом деплоя, если инстансов больше одного.
- `DEBUG=false` (иначе 500‑ошибки отдают текст исключения).
- Образ собирается из `Dockerfile` (uv, Python 3.12), запуск — `uvicorn app.main:app`.
