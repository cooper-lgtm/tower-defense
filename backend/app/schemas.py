from datetime import datetime, timedelta
from typing import Any, List, Optional

from pydantic import BaseModel, Field


class Token(BaseModel):
  """登录响应：JWT 与过期秒数。"""

  access_token: str
  token_type: str = "bearer"
  expires_in: int


class LoginRequest(BaseModel):
  """登录/注册请求；游客可缺省密码。"""

  name: str = Field(default="guest")
  password: Optional[str] = None


class UserOut(BaseModel):
  id: int
  name: str

  class Config:
    from_attributes = True


class LevelResponse(BaseModel):
  """关卡返回：携带版本与 hash。"""

  id: str
  version: str
  hash: str
  config: Any


class ScoreSubmit(BaseModel):
  """成绩上传参数，含版本/hash 校验字段。"""

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
  """成绩持久化后的返回。"""

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
  """榜单条目。"""

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
