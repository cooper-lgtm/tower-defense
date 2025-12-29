import json
from typing import Any, Dict, List, Optional

import redis

from ..core.config import get_settings
from ..schemas import LeaderboardEntry

settings = get_settings()


class Leaderboard:
  """
  榜单服务：Redis ZSET 封装，Redis 不可用时使用内存回退。
  """

  def __init__(self, client: Optional[redis.Redis] = None):
    self.client = client
    self.fallback: Dict[str, List[LeaderboardEntry]] = {}

  def _key(self, level_id: str, scope: str = "all") -> str:
    return f"leaderboard:{level_id}:{scope}"

  def submit(self, level_id: str, entry: LeaderboardEntry, scope: str = "all") -> None:
    key = self._key(level_id, scope)
    member = str(entry.user_id)
    if self.client:
      payload = entry.model_dump(mode="json")
      payload_key = f"{key}:payloads"
      # 仅保留用户最高分
      prev_score = self.client.zscore(key, member)
      if prev_score is None or entry.score > prev_score:
        self.client.zadd(key, {member: entry.score})
        self.client.hset(payload_key, member, json.dumps(payload))
      self.client.zremrangebyrank(key, 0, -(settings.leaderboard_size + 1))
      self.client.publish(f"{key}:events", json.dumps({"type": "update"}))
      return

    # 内存模式：排序并截断
    self.fallback.setdefault(key, [])
    bucket = self.fallback[key]
    # 按 user_id 去重，记录最高分；同分取时间短者
    existing_idx = next((i for i, e in enumerate(bucket) if e.user_id == entry.user_id), None)
    if existing_idx is None:
      bucket.append(entry)
    else:
      existing = bucket[existing_idx]
      if entry.score > existing.score or (entry.score == existing.score and entry.time_ms < existing.time_ms):
        bucket[existing_idx] = entry
    bucket.sort(key=lambda e: (-e.score, e.time_ms))
    if len(bucket) > settings.leaderboard_size:
      bucket[:] = bucket[: settings.leaderboard_size]

  def top(self, level_id: str, scope: str = "all", limit: int = 10) -> List[LeaderboardEntry]:
    key = self._key(level_id, scope)
    if self.client:
      payload_key = f"{key}:payloads"
      user_ids = self.client.zrevrange(key, 0, limit - 1, withscores=False)
      if not user_ids:
        return []
      # redis-py hmget expects args unpacked, not a single list
      payloads = self.client.hmget(payload_key, *user_ids)
      result: List[LeaderboardEntry] = []
      for raw in payloads:
        if raw:
          result.append(LeaderboardEntry(**json.loads(raw)))
      return result
    return self.fallback.get(key, [])[:limit]
