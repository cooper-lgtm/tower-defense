from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
  """集中配置，支持环境变量覆盖（前缀 TD_）。"""
  app_name: str = "Tower Defense"
  api_prefix: str = "/api"
  secret_key: str = "dev-secret"
  access_token_expire_minutes: int = 60 * 24
  algorithm: str = "HS256"
  score_signature_key: str = "dev-signing-key"
  score_signature_window_seconds: int = 120

  database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/tower_defense"
  redis_url: str = "redis://localhost:6379/0"
  leaderboard_size: int = 10
  level_dir: Path = Path("app/data/levels")

  model_config = SettingsConfigDict(env_file=".env", env_prefix="TD_", extra="ignore")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
  return Settings()
