import time
from typing import Dict, Optional

import redis


class NonceStore:
  """
  一次性 nonce 校验器：优先使用 Redis，失败则回退内存，避免重放。
  """

  def __init__(self, client: Optional[redis.Redis] = None):
    self.client = client
    self.fallback: Dict[str, float] = {}

  def check_and_store(self, nonce: str, ttl_seconds: int) -> bool:
    now = time.time()
    if self.client:
      # setnx + expire，成功返回 True
      return bool(self.client.set(name=f"nonce:{nonce}", value="1", nx=True, ex=ttl_seconds))

    # 内存模式：清理过期，检查是否存在
    expired = [k for k, exp in self.fallback.items() if exp <= now]
    for k in expired:
      del self.fallback[k]
    if nonce in self.fallback:
      return False
    self.fallback[nonce] = now + ttl_seconds
    return True
