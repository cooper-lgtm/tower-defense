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
- `TD_SCORE_SIGNATURE_KEY` (HMAC 密钥，客户端需用同值构造成绩签名)
- `TD_SCORE_SIGNATURE_WINDOW_SECONDS` (签名时间窗秒数，默认 120)

API surface (prefixed by `/api`):
- `POST /auth/login` → JWT
- `GET /levels/{id}` → level config + version/hash
- `GET /leaderboard?level=endless&scope=all` → top entries
- `POST /score` → submit score (requires Bearer token + HMAC-SHA256 签名，字段顺序 `level_id|level_version|level_hash|score|wave|time_ms|life_left|timestamp|nonce|ops_digest`)
- `WS /ws/leaderboard` → streaming leaderboard snapshot

Level configs live in `app/data/levels/`. Hashing uses deterministic FNV-1a to align with the client.

try to use webhook to auto deploy
