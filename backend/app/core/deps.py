from collections.abc import Generator
from typing import Optional

import redis

from ..services.leaderboard import Leaderboard
from .config import get_settings


def get_redis() -> Generator[redis.Redis, None, None]:
  client = redis.from_url(get_settings().redis_url, decode_responses=True)
  try:
    yield client
  finally:
    client.close()


def get_leaderboard(client: Optional[redis.Redis] = None) -> Leaderboard:
  try:
    redis_client = client or redis.from_url(get_settings().redis_url, decode_responses=True)
  except Exception:
    redis_client = None
  return Leaderboard(redis_client)
