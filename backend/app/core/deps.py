from collections.abc import Generator
from typing import Optional

import redis

from ..services.leaderboard import Leaderboard
from .config import get_settings


def get_redis() -> Generator[redis.Redis, None, None]:
  """Redis 连接依赖。"""
  client = redis.from_url(get_settings().redis_url, decode_responses=True)
  try:
    yield client
  finally:
    client.close()


def get_leaderboard() -> Leaderboard:
  """
  榜单依赖：内部尝试连接 Redis，失败则回退内存实现，避免类型注入错误。
  """
  try:
    redis_client = redis.from_url(get_settings().redis_url, decode_responses=True)
  except Exception:
    redis_client = None
  return Leaderboard(redis_client)
