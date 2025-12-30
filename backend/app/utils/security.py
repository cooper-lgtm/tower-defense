import hmac
import hashlib
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from jose import jwt
from passlib.context import CryptContext

from ..core.config import get_settings
from ..schemas import ScoreSubmit

# 使用 pbkdf2_sha256 避免 bcrypt 兼容性问题
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
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


def _signature_payload(payload: ScoreSubmit) -> str:
  """
  按固定顺序拼接签名字段。缺省值使用空串，确保双方一致。
  """
  parts = [
    payload.level_id,
    payload.level_version,
    payload.level_hash,
    str(payload.score),
    str(payload.wave),
    str(payload.time_ms),
    str(payload.life_left),
    str(payload.timestamp),
    payload.nonce,
    payload.ops_digest or "",
  ]
  return "|".join(parts)


def compute_score_signature(secret: str, payload: ScoreSubmit) -> str:
  """用于测试/客户端复用的签名计算。"""
  message = _signature_payload(payload).encode("utf-8")
  return hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()


def verify_score_signature(secret: str, payload: ScoreSubmit) -> bool:
  """验证成绩上传签名。"""
  if not secret:
    return False
  if not payload.signature:
    return False
  expected = compute_score_signature(secret, payload)
  return hmac.compare_digest(expected, payload.signature)
