from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from jose import jwt
from passlib.context import CryptContext

from ..core.config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
settings = get_settings()


def verify_password(plain_password: str, hashed_password: str) -> bool:
  """校验密码。"""
  return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
  """生成密码哈希。"""
  return pwd_context.hash(password)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
  """签发 JWT，默认使用配置时长。"""
  to_encode = data.copy()
  expire = datetime.utcnow() + (
    expires_delta if expires_delta is not None else timedelta(minutes=settings.access_token_expire_minutes)
  )
  to_encode.update({"exp": expire})
  encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
  return encoded_jwt
