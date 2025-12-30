import time
import uuid

from app.services.levels import load_level
from app.schemas import ScoreSubmit
from app.core.config import get_settings
from app.utils.security import compute_score_signature

settings = get_settings()


def register_and_login(client, name: str, password: str = "p@ss") -> str:
  register_path = client.app.url_path_for("auth_register")
  login_path = client.app.url_path_for("auth_login")

  client.post(register_path, json={"name": name, "password": password})
  res = client.post(login_path, json={"name": name, "password": password})
  assert res.status_code == 200
  return res.json()["access_token"]


def auth_headers(client, name: str) -> dict[str, str]:
  token = register_and_login(client, name)
  return {"Authorization": f"Bearer {token}"}


def test_submit_score_and_fetch_best_score(client):
  headers = auth_headers(client, "alice")
  submit_path = client.app.url_path_for("submit_score")
  best_path = client.app.url_path_for("best_score")
  level = load_level("endless")
  payload = signed_score_payload(
    level,
    overrides={"score": 1200, "wave": 8, "time_ms": 90000, "life_left": 7},
  )

  submit = client.post(submit_path, json=payload, headers=headers)
  assert submit.status_code == 200
  body = submit.json()
  assert body["score"] == payload["score"]
  assert body["wave"] == payload["wave"]
  assert body["level_id"] == level["id"]

  best = client.get(best_path, params={"level": level["id"]}, headers=headers)
  assert best.status_code == 200
  best_body = best.json()
  assert best_body["best_score"] == payload["score"]
  assert best_body["wave"] == payload["wave"]
  assert best_body["time_ms"] == payload["time_ms"]


def test_leaderboard_orders_and_deduplicates(client):
  level = load_level("endless")
  submit_path = client.app.url_path_for("submit_score")
  leaderboard_path = client.app.url_path_for("read_leaderboard")
  alice_headers = auth_headers(client, "alice")
  bob_headers = auth_headers(client, "bob")

  base_payload = {
    "level_id": level["id"],
    "level_version": level["version"],
    "level_hash": level["hash"],
    "wave": 5,
    "time_ms": 80000,
    "life_left": 10,
  }

  client.post(submit_path, json=signed_score_payload(level, {**base_payload, "score": 1000, "time_ms": 85000}), headers=alice_headers)
  client.post(submit_path, json=signed_score_payload(level, {**base_payload, "score": 1500, "time_ms": 90000}), headers=bob_headers)
  # Alice 再次提交更高分，应该覆盖她在榜单中的记录
  client.post(
    submit_path,
    json=signed_score_payload(level, {**base_payload, "score": 1800, "time_ms": 87000}),
    headers=alice_headers,
  )

  resp = client.get(leaderboard_path, params={"level": level["id"], "scope": "all", "limit": 10})
  assert resp.status_code == 200
  entries = resp.json()["entries"]

  assert len(entries) == 2
  assert entries[0]["name"] == "alice"
  assert entries[0]["score"] == 1800
  assert entries[1]["name"] == "bob"
  assert entries[1]["score"] == 1500


def signed_score_payload(level: dict, overrides: dict) -> dict:
  """构建带签名的成绩请求体。"""
  base = {
    "level_id": level["id"],
    "level_version": level["version"],
    "level_hash": level["hash"],
    "score": overrides.get("score", 0),
    "wave": overrides.get("wave", 1),
    "time_ms": overrides.get("time_ms", 0),
    "life_left": overrides.get("life_left", 0),
    "timestamp": int(time.time()),
    "nonce": str(uuid.uuid4()),
    "ops_digest": overrides.get("ops_digest"),
  }
  # 使用 Pydantic 校验 payload 结构，生成签名
  model = ScoreSubmit(**base)
  base["signature"] = compute_score_signature(settings.score_signature_key, model)
  return base
