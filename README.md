# Tower Defense MVP

This repo contains a canvas-based TypeScript client (`frontend/`) and a FastAPI backend skeleton (`backend/`) that follow the endless-mode design plan.

## Frontend
- Stack: Vite + TypeScript + Canvas2D.
- Game loop with fixed update/render split, simple towers/enemies, difficulty-scaling wave generator, pathing with 4-neighbor A* and build-blocking detection.
- Run: `cd frontend && npm install && npm run dev` (or `npm run build`).

## Backend
- Stack: FastAPI + Postgres (SQLAlchemy) + Redis ZSET leaderboard + JWT auth.
- Run: `cd backend && python -m venv .venv && source .venv/bin/activate && pip install -e . -i https://pypi.org/simple && uvicorn app.main:app --reload`.
- Endpoints: `/api/auth/login`, `/api/levels/{id}`, `/api/leaderboard`, `/api/score`, and `ws://.../ws/leaderboard`.
- Level configs live in `backend/app/data/levels/`; hashing uses deterministic FNV-1a to align with the client.

Next steps
- Wire DB migrations (Alembic), Redis connection health checks, and worker queue (RQ) for async validation.
- Extend client build/upgrade/sell UI, replay/snapshot capture for anti-cheat, and connect to backend APIs with hash validation.
