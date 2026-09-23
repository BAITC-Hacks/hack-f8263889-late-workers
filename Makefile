.DEFAULT_GOAL := help
# yarn v1 lockfile; fall back to a one-off yarn via npx when yarn isn't installed
YARN := $(shell command -v yarn 2>/dev/null || echo npx -y yarn@1)

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

env: ## Create backend/.env and frontend/.env from the examples (no installs)
	@test -f backend/.env || cp backend/.env.example backend/.env
	@test -f frontend/.env || cp frontend/.env.example frontend/.env

setup: env ## Install deps for both apps (local dev) and create .env files
	$(MAKE) -C backend setup
	cd frontend && $(YARN) install --frozen-lockfile

infra: ## Start Postgres + Redis in Docker (backend)
	$(MAKE) -C backend infra

backend: ## Run the API on http://localhost:8000 (docs at /docs)
	$(MAKE) -C backend dev

frontend: ## Run the web app on http://localhost:5173
	cd frontend && npm run dev

dev: ## Run API + web app together (Ctrl+C stops both)
	@trap 'kill 0' INT TERM; \
	$(MAKE) -C backend dev & \
	$(MAKE) frontend & \
	wait

docker-up: ## Full stack in Docker: Postgres + Redis + API + web, with hot reload
	docker compose up --build

docker-down: ## Stop the Docker stack (data is kept)
	docker compose down

docker-reset: ## Stop the Docker stack and delete the database volume
	docker compose down -v

test: ## Backend tests
	$(MAKE) -C backend test

lint: ## Lint + typecheck both apps
	$(MAKE) -C backend lint
	cd frontend && npm run lint && npm run typecheck

.PHONY: help env setup infra backend frontend dev docker-up docker-down docker-reset test lint
