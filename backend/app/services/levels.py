import json
from pathlib import Path
from typing import Any, Dict

from ..core.config import get_settings
from ..utils.hash import hash_level_config


def load_level(level_id: str) -> Dict[str, Any]:
  """读取关卡 JSON，计算并回填 hash。"""
  settings = get_settings()
  level_path = Path(settings.level_dir) / f"{level_id}.json"
  if not level_path.exists():
    raise FileNotFoundError(f"Level {level_id} not found")

  raw = json.loads(level_path.read_text(encoding="utf-8"))
  metadata = raw.get("metadata", {})
  computed_hash = hash_level_config({**raw, "metadata": {**metadata, "hash": ""}})
  raw["metadata"] = {**metadata, "hash": computed_hash}

  return {
    "id": level_id,
    "version": raw["metadata"]["version"],
    "hash": computed_hash,
    "config": raw,
  }
