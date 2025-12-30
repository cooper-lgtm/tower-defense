# ARCHITECTURE

## 模块划分
- `app/main.py`
  - 创建 FastAPI 应用，挂载 CORS。
  - 注册 API 路由前缀 `/api`；暴露 `/ws/leaderboard` WebSocket 推送榜单。
- `app/api/routes.py`
  - 认证：`auth_register`, `auth_login`。
  - 关卡：`get_level`。
  - 成绩与榜单：`submit_score`, `best_score`, `read_leaderboard`。
- `app/core/`
  - `config.py`：集中配置，支持环境变量 `TD_*`。
  - `db.py`：SQLAlchemy Engine/Session/Base 及 `get_db` 依赖。
  - `deps.py`：Redis/Leaderboard 依赖，自动回退内存版。
- `app/models.py`
  - ORM 实体：User、Level、Score。
- `app/schemas.py`
  - Pydantic 模型：请求/响应契约。
- `app/services/levels.py`
  - 关卡读取、hash 计算。
- `app/services/leaderboard.py`
  - 榜单服务：Redis ZSET + 内存回退，负责去重、排序、截断。
- `app/utils/security.py`
  - 密码哈希校验与 JWT 签发。

## 关键流程（文字）
- **注册**：`POST /api/auth/register` → 校验重名/保留名 → bcrypt 哈希存库 → 返回用户信息。
- **登录/游客**：`POST /api/auth/login` → 普通用户校验密码 → 签发 JWT，`sub` 为用户 id；guest 返回 `sub=guest`。
- **获取关卡**：`GET /api/levels/{id}` → 从磁盘读取 JSON → 计算 hash 回填 → 返回配置 + 版本/hash。
- **提交成绩**：`POST /api/score`（需 Bearer）
  1) 拒绝 guest；加载关卡，校验 version/hash。
  2) Upsert Level（配置/版本/hash）与 Score 记录。
  3) 触发 Leaderboard.submit：同用户只保留最高分，若同分则耗时短优先；超长截断。
- **查询最高分**：`GET /api/score/best`（需 Bearer）→ 取该用户该关卡最高分（即便未上榜）。
- **查询榜单**：`GET /api/leaderboard` → 从 Redis 或内存获取前 N。
- **榜单推送**：`/ws/leaderboard` → 每 2s 读取榜单并推送 JSON 快照。

## 依赖与运行形态
- 数据库：默认 Postgres，可通过 `TD_DATABASE_URL` 切换；测试用内存 SQLite。
- 缓存/榜单：Redis，缺失时自动回退内存（进程内，不持久）。
- 部署：可 `uvicorn app.main:app --reload` 开发，或容器化/compose。
