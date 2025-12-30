# Backend API 说明（/api 前缀）

## 通用
- 认证：除登录/注册、取关卡/榜单外，其他需 Bearer Token（`Authorization: Bearer <JWT>`）。
- Content-Type：`application/json`。
- 成绩签名：上传成绩需 HMAC-SHA256（字段顺序：`level_id|level_version|level_hash|score|wave|time_ms|life_left|timestamp|nonce|ops_digest`），时间窗 120s，nonce 一次性。

## 认证
- `POST /auth/register`
  - 请求：`{ "name": string, "password": string }`
  - 响应：`{ "id": int, "name": string }`
  - 说明：保留名 `guest` 不可注册，重名/缺密码返回 400。

- `POST /auth/login`
  - 请求：`{ "name": string, "password"?: string }`（缺省或 `guest` 视为游客登录）
  - 响应：`{ "access_token": string, "token_type": "bearer", "expires_in": int }`
  - 说明：普通用户需密码；游客返回 token 但不参与榜单。

## 关卡
- `GET /levels/{level_id}`
  - 响应：`{ "id": string, "version": string, "hash": string, "config": <关卡配置 JSON> }`
  - 说明：客户端开局前获取最新关卡配置与 version/hash，用于后续成绩校验。

## 榜单
- `GET /leaderboard?level=endless&scope=all&limit=10`
  - 响应：`{ "level": string, "scope": string, "entries": [ { "user_id": int, "name": string, "score": int, "wave": int, "time_ms": int, "life_left": int, "created_at": datetime } ] }`
  - 说明：按分数降序，同分取耗时更短；`limit` 1~100。

## 成绩
- `POST /score`（需 Bearer Token）
  - 请求字段：
    - 关卡校验：`level_id`, `level_version`, `level_hash`
    - 成绩：`score`, `wave`, `time_ms`, `life_left`
    - 签名：`timestamp`（秒级）, `nonce`（唯一）, `signature`（HMAC-SHA256 hex）, `ops_digest`（可选）
  - 响应：`{ "id": int, "user_id": int, "level_id": string, "score": int, "wave": int, "time_ms": int, "life_left": int, "created_at": datetime }`
  - 校验流程：JWT → timestamp 时间窗（默认 120s）→ nonce 去重 → 签名比对 → 关卡 version/hash 比对 → 入库并更新榜单（同用户仅保留最高分，同分取耗时短）。

- `GET /score/best?level=endless`（需 Bearer Token）
  - 响应：`{ "best_score": int|null, "wave": int|null, "time_ms": int|null, "life_left": int|null, "created_at": datetime|null }`
  - 说明：返回当前登录用户在该关卡的最高分记录（即便未上榜）。

## 实时榜单
- `WS /ws/leaderboard?level=endless&scope=all`
  - 说明：每隔 2 秒推送当前榜单快照：`{ "entries": [<同 leaderboard entries 结构>] }`。无需鉴权。  
