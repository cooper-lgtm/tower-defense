import json
from typing import Any

FNV_OFFSET = 0x811C9DC5
FNV_PRIME = 0x01000193


def stable_dumps(value: Any) -> str:
  """稳定序列化（排序 keys），与前端保持一致。"""
  return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def fnv1a_hash(data: str) -> str:
  """FNV-1a 简易一致性哈希（非安全用途）。"""
  hash_val = FNV_OFFSET
  for ch in data:
    hash_val ^= ord(ch)
    hash_val = (hash_val * FNV_PRIME) % (1 << 32)
  return f"fnv1a-{hash_val:08x}"


def hash_level_config(config: Any) -> str:
  """计算关卡配置 hash。"""
  payload = stable_dumps(config)
  return fnv1a_hash(payload)
