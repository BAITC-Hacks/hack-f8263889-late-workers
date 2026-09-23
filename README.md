# hack-f8263889-late-workers

React-фронтенд и FastAPI backend команды Late Workers. Авторизация, каталог задач и сохранения подключены к PostgreSQL; моки по умолчанию выключены.

## Локальный запуск

Нужны Docker, uv с Python 3.12+, Node.js 22.12+ и Yarn.

```bash
make setup
make infra
make -C backend migrate
make dev
```

Фронтенд: [localhost:5173](http://localhost:5173). API: [localhost:8000/docs](http://localhost:8000/docs). PostgreSQL: `localhost:5439`, база `app`, пользователь и пароль `postgres` (локальная разработка).

Для существующих `.env` проверьте `DATABASE_URL` по [backend/.env.example](backend/.env.example) и `AUTH_MOCKS=false` по [frontend/.env.example](frontend/.env.example). Vite передаёт `/api` в FastAPI вместе с cookie; отдельный адрес API в браузере не нужен.

В новой демонстрационной базе можно выполнить `make -C backend seed`: появятся 3 бизнеса, 6 студентов и 7 задач. **Seed удаляет существующие аккаунты и связанные данные.** Демонстрационный вход: `owner@zerno.kz` (бизнес) или `arman@student.kz` (студент), пароль обоих — `demo2026`.

Полный стек в Docker: `make docker-up`. Он использует свою БД и запускает frontend с реальным API. Перед этим остановите локальные приложения и `make -C backend infra-down`, чтобы освободить порты. Миграции применяются при старте API; demo seed при необходимости запускается через `docker compose exec api python -m app.seed` с тем же удалением данных.


Подробности и mock-режим: [frontend/README.md](frontend/README.md). Документация сервера: [backend/README.md](backend/README.md).
