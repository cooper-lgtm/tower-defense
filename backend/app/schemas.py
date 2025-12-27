from datetime import datetime, timedelta
from typing import Any, List, Optional

from pydantic import BaseModel, Field


class Token(BaseModel):
  access_token: str
  token_type: str = "bearer"
  expires_in: int


class LoginRequest(BaseModel):
  name: str = Field(default="guest")
  password: Optional[str] = None


class UserOut(BaseModel):
  id: int
  name: str

  class Config:
    from_attributes = True


class LevelResponse(BaseModel):
  id: str
  version: str
  hash: str
  config: Any


class ScoreSubmit(BaseModel):
  score: int
  wave: int
  time_ms: int
  life_left: int
  level_id: str
  level_version: str
  level_hash: str
  signature: Optional[str] = None
  ops_digest: Optional[str] = None


class ScoreOut(BaseModel):
  id: int
  user_id: int
  level_id: str
  score: int
  wave: int
  time_ms: int
  life_left: int
  created_at: datetime

  class Config:
    from_attributes = True


class LeaderboardEntry(BaseModel):
  user_id: int
  name: str
  score: int
  wave: int
  time_ms: int
  life_left: int
  created_at: datetime


class LeaderboardResponse(BaseModel):
  level: str
  scope: str = "all"
  entries: List[LeaderboardEntry]
