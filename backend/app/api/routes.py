from datetime import timedelta
from secrets import token_hex
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from ..core.config import get_settings
from ..core.db import get_db
from ..core.deps import get_leaderboard
from ..models import Score, User
from ..schemas import (
  LeaderboardEntry,
  LeaderboardResponse,
  LevelResponse,
  LoginRequest,
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
  user = get_user(db, name)
  if not user:
    return create_user(db, name, password or name)
  if password and not verify_password(password, user.hash_pwd):
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password")
  return user


async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
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
    user_id = int(sub)
  except (JWTError, ValueError):
    raise credentials_exception
  user = get_user_by_id(db, user_id)
  if user is None:
    raise credentials_exception
  return user


@router.post("/auth/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> Token:
  name = payload.name or f"guest-{token_hex(3)}"
  user = authenticate_user(db, name, payload.password)
  access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
  token = create_access_token({"sub": str(user.id)}, expires_delta=access_token_expires)
  return Token(access_token=token, expires_in=int(access_token_expires.total_seconds()))


@router.get("/levels/{level_id}", response_model=LevelResponse)
def get_level(level_id: str) -> LevelResponse:
  level = load_level(level_id)
  return LevelResponse(id=level["id"], version=level["version"], hash=level["hash"], config=level["config"])


@router.get("/leaderboard", response_model=LeaderboardResponse)
def read_leaderboard(
  level: str = Query("endless"),
  scope: str = Query("all"),
  limit: int = Query(10, ge=1, le=100),
  leaderboard: Leaderboard = Depends(get_leaderboard),
) -> LeaderboardResponse:
  entries = leaderboard.top(level, scope=scope, limit=limit)
  return LeaderboardResponse(level=level, scope=scope, entries=entries)


@router.post("/score", response_model=ScoreOut)
def submit_score(
  payload: ScoreSubmit,
  db: Session = Depends(get_db),
  user: User = Depends(get_current_user),
  leaderboard: Leaderboard = Depends(get_leaderboard),
) -> ScoreOut:
  level = load_level(payload.level_id)
  if payload.level_hash != level["hash"]:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Level hash mismatch")
  if payload.level_version != level["version"]:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Level version mismatch")

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
