.DEFAULT_GOAL := help
COMPOSE := docker compose

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

setup: ## Install deps and create .env from the example
	uv sync
	@test -f .env || cp .env.example .env

infra: ## Start Postgres + Redis in Docker
	$(COMPOSE) up -d db redis

infra-down: ## Stop Postgres + Redis
	$(COMPOSE) down

dev: ## Run the API with auto-reload (migrations run on startup)
	uv run uvicorn app.main:app --reload --port 8000

seed: ## Load the demo dataset (3 businesses, 6 students, 7 tasks)
	uv run python -m app.seed

test-db: ## Create the test database (idempotent; needs `make infra` running)
	@$(COMPOSE) exec -T db psql -U postgres -tc \
		"SELECT 1 FROM pg_database WHERE datname='app_test'" | grep -q 1 \
		|| $(COMPOSE) exec -T db psql -U postgres -c "CREATE DATABASE app_test"

test: test-db ## Run tests (against Postgres in Docker)
	uv run pytest

lint: ## Lint + format check
	uv run ruff check .
	uv run ruff format --check .

fmt: ## Auto-fix lint issues and format
	uv run ruff check --fix .
	uv run ruff format .

migrate: ## Apply migrations
	uv run alembic upgrade head

migration: ## Create a migration: make migration m="add foo"
	uv run alembic revision --autogenerate -m "$(m)"

docker-up: ## Build and run the full stack in Docker
	$(COMPOSE) up --build

docker-down: ## Stop the full stack
	$(COMPOSE) down -v

.PHONY: help setup infra infra-down dev seed test-db test lint fmt migrate migration docker-up docker-down
