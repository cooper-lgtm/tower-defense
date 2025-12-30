from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from ..core.config import get_settings
from ..core.db import get_db
from ..core.deps import get_leaderboard
from ..models import Score, User, Level
from ..schemas import (
  BestScoreResponse,
  LeaderboardEntry,
  LeaderboardResponse,
  LevelResponse,
  LoginRequest,
  RegisterRequest,
  UserOut,
  ScoreOut,
  ScoreSubmit,
  Token,
)
from ..services.levels import load_level
from ..services.leaderboard import Leaderboard
from ..utils.security import create_access_token, get_password_hash, verify_password

settings = get_settings()
router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.api_prefix}/auth/login")


def get_user(db: Session, name: str) -> Optional[User]:
  return db.query(User).filter(User.name == name).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
  return db.get(User, user_id)


def create_user(db: Session, name: str, password: str) -> User:
  user = User(name=name, hash_pwd=get_password_hash(password))
  db.add(user)
  db.commit()
  db.refresh(user)
  return user


def authenticate_user(db: Session, name: str, password: Optional[str]) -> User:
  """用户存在则校验密码；guest 允许无密码用于体验。"""
  if name == "guest":
    # 游客不入库，用于试玩，不参与榜单
    guest = User(id=0, name="guest", hash_pwd="", created_at=None)  # type: ignore[arg-type]
    return guest

  user = get_user(db, name)
  if not user:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
  if not password:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password required")
  if not verify_password(password, user.hash_pwd):
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password")
  return user


async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
  """解析 JWT，获取当前用户。"""
  credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
  )
  try:
    payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    sub = payload.get("sub")
    if sub is None:
      raise credentials_exception
    if sub == "guest":
      return User(id=0, name="guest", hash_pwd="", created_at=None)  # type: ignore[arg-type]
    user_id = int(sub)
  except (JWTError, ValueError):
    raise credentials_exception
  user = get_user_by_id(db, user_id)
  if user is None:
    raise credentials_exception
  return user


@router.post("/auth/login", response_model=Token, name="auth_login")
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> Token:
  """登录，返回 JWT。游客不计入榜单。"""
  name = payload.name or "guest"
  user = authenticate_user(db, name, payload.password)
  access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
  token_sub = "guest" if user.name == "guest" else str(user.id)
  token = create_access_token({"sub": token_sub}, expires_delta=access_token_expires)
  return Token(access_token=token, expires_in=int(access_token_expires.total_seconds()))


@router.post("/auth/register", response_model=UserOut, status_code=status.HTTP_201_CREATED, name="auth_register")
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> UserOut:
  """注册新用户：名称唯一，需密码。"""
  if payload.name == "guest":
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reserved username")
  if get_user(db, payload.name):
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")
  if not payload.password:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password required")
  user = create_user(db, payload.name, payload.password)
  return UserOut.model_validate(user)


@router.get("/levels/{level_id}", response_model=LevelResponse, name="get_level")
def get_level(level_id: str) -> LevelResponse:
  """获取关卡配置（附带版本/hash）。"""
  level = load_level(level_id)
  return LevelResponse(id=level["id"], version=level["version"], hash=level["hash"], config=level["config"])


@router.get("/leaderboard", response_model=LeaderboardResponse, name="read_leaderboard")
def read_leaderboard(
  level: str = Query("endless"),
  scope: str = Query("all"),
  limit: int = Query(10, ge=1, le=100),
  leaderboard: Leaderboard = Depends(get_leaderboard),
) -> LeaderboardResponse:
  """读取榜单，支持 scope/limit。"""
  entries = leaderboard.top(level, scope=scope, limit=limit)
  return LeaderboardResponse(level=level, scope=scope, entries=entries)


@router.post("/score", response_model=ScoreOut, name="submit_score")
def submit_score(
  payload: ScoreSubmit,
  db: Session = Depends(get_db),
  user: User = Depends(get_current_user),
  leaderboard: Leaderboard = Depends(get_leaderboard),
) -> ScoreOut:
  """提交成绩：校验版本/hash，存库并更新榜单。"""
  if user.name == "guest":
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Guest scores are not ranked")
  level = load_level(payload.level_id)
  if payload.level_hash != level["hash"]:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Level hash mismatch")
  if payload.level_version != level["version"]:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Level version mismatch")

  db_level = db.get(Level, payload.level_id)
  if not db_level:
    db_level = Level(
      id=payload.level_id,
      config_json=level["config"],
      version=level["version"],
      hash=level["hash"],
    )
    db.add(db_level)
  else:
    db_level.config_json = level["config"]
    db_level.version = level["version"]
    db_level.hash = level["hash"]

  score = Score(
    user_id=user.id,
    level_id=payload.level_id,
    score=payload.score,
    wave=payload.wave,
    time_ms=payload.time_ms,
    life_left=payload.life_left,
  )
  db.add(score)
  db.commit()
  db.refresh(score)

  lb_entry = LeaderboardEntry(
    user_id=user.id,
    name=user.name,
    score=payload.score,
    wave=payload.wave,
    time_ms=payload.time_ms,
    life_left=payload.life_left,
    created_at=score.created_at,
  )
  leaderboard.submit(payload.level_id, lb_entry, scope="all")

  return ScoreOut.model_validate(score)


@router.get("/score/best", response_model=BestScoreResponse, name="best_score")
def best_score(
  level: str = Query("endless"),
  db: Session = Depends(get_db),
  user: User = Depends(get_current_user),
) -> BestScoreResponse:
  """返回当前用户该关卡的最高分（即便不在榜单内）。"""
  if user.name == "guest":
    return BestScoreResponse(
      best_score=None,
      wave=None,
      time_ms=None,
      life_left=None,
      created_at=None,
    )

  best = (
    db.query(Score)
    .filter(Score.user_id == user.id, Score.level_id == level)
    .order_by(Score.score.desc(), Score.time_ms.asc())
    .first()
  )
  if not best:
    return BestScoreResponse(best_score=None, wave=None, time_ms=None, life_left=None, created_at=None)

  return BestScoreResponse(
    best_score=best.score,
    wave=best.wave,
    time_ms=best.time_ms,
    life_left=best.life_left,
    created_at=best.created_at,
  )
