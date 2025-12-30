# Tower Defense Backend (FastAPI)

## Quickstart

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .
uvicorn app.main:app --reload
```

## Testing

```bash
cd backend
pip install -e '.[dev]'    # 安装 pytest/ruff/black 等开发依赖
pytest -q                  # 运行后端单元测试
```

Environment variables (see `app/core/config.py`, prefix `TD_`):
- `TD_DATABASE_URL` (Postgres, default `postgresql+psycopg2://postgres:postgres@localhost:5432/tower_defense`)
- `TD_REDIS_URL` (default `redis://localhost:6379/0`)
- `TD_SECRET_KEY` (JWT secret)
- `TD_LEADERBOARD_SIZE` (default 10)

API surface (prefixed by `/api`):
- `POST /auth/login` → JWT
- `GET /levels/{id}` → level config + version/hash
- `GET /leaderboard?level=endless&scope=all` → top entries
- `POST /score` → submit score (requires Bearer token)
- `WS /ws/leaderboard` → streaming leaderboard snapshot

Level configs live in `app/data/levels/`. Hashing uses deterministic FNV-1a to align with the client.

try to use webhook to auto deploy
