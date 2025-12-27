import json
from typing import Any, Dict, List, Optional

import redis

from ..core.config import get_settings
from ..schemas import LeaderboardEntry

settings = get_settings()


class Leaderboard:
  """
  Thin Redis ZSET wrapper with in-memory fallback for local dev.
  """

  def __init__(self, client: Optional[redis.Redis] = None):
    self.client = client
    self.fallback: Dict[str, List[LeaderboardEntry]] = {}

  def _key(self, level_id: str, scope: str = "all") -> str:
    return f"leaderboard:{level_id}:{scope}"

  def submit(self, level_id: str, entry: LeaderboardEntry, scope: str = "all") -> None:
    key = self._key(level_id, scope)
    if self.client:
      payload = entry.model_dump(mode="json")
      self.client.zadd(key, {json.dumps(payload): entry.score})
      self.client.zremrangebyrank(key, 0, -(settings.leaderboard_size + 1))
      self.client.publish(f"{key}:events", json.dumps({"type": "update"}))
      return

    self.fallback.setdefault(key, [])
    bucket = self.fallback[key]
    bucket.append(entry)
    bucket.sort(key=lambda e: (-e.score, e.time_ms))
    if len(bucket) > settings.leaderboard_size:
      bucket[:] = bucket[: settings.leaderboard_size]

  def top(self, level_id: str, scope: str = "all", limit: int = 10) -> List[LeaderboardEntry]:
    key = self._key(level_id, scope)
    if self.client:
      raw = self.client.zrevrange(key, 0, limit - 1, withscores=False)
      return [LeaderboardEntry(**json.loads(item)) for item in raw]
    return self.fallback.get(key, [])[:limit]
