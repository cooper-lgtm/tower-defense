# Tower Defense MVP

This repo contains a canvas-based TypeScript client (`frontend/`) and a FastAPI backend skeleton (`backend/`) that follow the endless-mode design plan.

## Frontend
- Stack: Vite + TypeScript + Canvas2D.
- Game loop with fixed update/render split, simple towers/enemies, difficulty-scaling wave generator, pathing with 4-neighbor A* and build-blocking detection.
- Run: `cd frontend && npm install && npm run dev` (or `npm run build`).

## Backend
- Stack: FastAPI + Postgres (SQLAlchemy) + Redis ZSET leaderboard + JWT auth.
- Dev infra: `cd backend && docker-compose up -d` (Postgres:5432, Redis:6379).
- Install: `cd backend && python -m venv .venv && source .venv/bin/activate && pip install -e . -i https://pypi.org/simple`.
- Bootstrap DB+tables: `cd backend && source .venv/bin/activate && python scripts/bootstrap_db.py`（如有权限会先建库，再跑 `alembic upgrade head`）。
- 如果库已存在且只需迁移：`cd backend && alembic upgrade head`（使用 `alembic.ini` 中 DB URL）。
- Run API: `cd backend && source .venv/bin/activate && venv/bin/python -m uvicorn app.main:app --reload`.
- Endpoints: `/api/auth/register`, `/api/auth/login`, `/api/levels/{id}`, `/api/leaderboard`, `/api/score`, and `ws://.../ws/leaderboard`.
- Level configs live in `backend/app/data/levels/`; hashing uses deterministic FNV-1a to align with the client.

Next steps
- Wire DB migrations (Alembic), Redis connection health checks, and worker queue (RQ) for async validation.
- Extend client build/upgrade/sell UI, replay/snapshot capture for anti-cheat, and connect to backend APIs with hash validation.
