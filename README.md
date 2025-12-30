# 塔防 MVP

本仓库包含一个基于 Canvas 的 TypeScript 前端（`frontend/`）和 FastAPI 后端（`backend/`），实现无尽模式的核心玩法。

## 前端
- 技术栈：Vite + TypeScript + Canvas2D。
- 功能：固定步长的更新/渲染循环，塔/怪基础数值，难度递增的波次生成器，四邻接 A* 路径和建造阻挡判定。
- 运行：`cd frontend && npm install && npm run dev`（或 `npm run build`）。

## 后端
- 技术栈：FastAPI + Postgres（SQLAlchemy）+ Redis ZSET 榜单 + JWT 认证。
- 开发环境：`cd backend && docker-compose up -d`（Postgres:5432，Redis:6379）。
- 安装：`cd backend && python -m venv .venv && source .venv/bin/activate && pip install -e . -i https://pypi.org/simple`。
- 初始化数据库：`cd backend && source .venv/bin/activate && python scripts/bootstrap_db.py`（有权限会建库并执行 `alembic upgrade head`）。
- 已有库仅迁移：`cd backend && alembic upgrade head`（使用 `alembic.ini` 的 DB URL）。
- 启动 API：`cd backend && source .venv/bin/activate && venv/bin/python -m uvicorn app.main:app --reload`。
- 接口：`/api/auth/register`、`/api/auth/login`、`/api/levels/{id}`、`/api/leaderboard`、`/api/score`、`ws://.../ws/leaderboard`。上传成绩需 HMAC-SHA256 签名（字段顺序：`level_id|level_version|level_hash|score|wave|time_ms|life_left|timestamp|nonce|ops_digest`），时间窗 2 分钟。
- 关卡配置：`backend/app/data/levels/`，hash 使用确定性的 FNV-1a，保证与客户端一致。
- 配置新增：`TD_SCORE_SIGNATURE_KEY`（服务端验签密钥）和 `TD_SCORE_SIGNATURE_WINDOW_SECONDS`（默认 120s），需与前端构建时的 `VITE_SCORE_SIGNING_KEY` 一致。

## 后续计划
- 衔接 Alembic 迁移、Redis 健康检查、RQ 等异步校验。
- 完善前端建造/升级/出售 UI，增加对局回放/快照的反作弊辅助，并持续与后端的 hash 校验对齐。
