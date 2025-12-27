from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from .core.db import Base


class User(Base):
  """用户表：存储昵称与密码哈希。"""

  __tablename__ = "users"

  id = Column(Integer, primary_key=True, index=True)
  name = Column(String, unique=True, index=True, nullable=False)
  hash_pwd = Column(String, nullable=False)
  created_at = Column(DateTime, server_default=func.now(), default=datetime.utcnow)

  scores = relationship("Score", back_populates="user")


class Level(Base):
  """关卡表：保存配置 JSON 及版本/hash。"""

  __tablename__ = "levels"

  id = Column(String, primary_key=True, index=True)
  config_json = Column(JSON, nullable=False)
  version = Column(String, nullable=False)
  hash = Column(String, nullable=False, index=True)
  created_at = Column(DateTime, server_default=func.now(), default=datetime.utcnow)

  scores = relationship("Score", back_populates="level")


class Score(Base):
  """成绩表：记录用户成绩并用于榜单。"""

  __tablename__ = "scores"

  id = Column(Integer, primary_key=True, index=True)
  user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
  level_id = Column(String, ForeignKey("levels.id"), nullable=False)
  score = Column(Integer, nullable=False)
  wave = Column(Integer, nullable=False)
  time_ms = Column(Integer, nullable=False)
  life_left = Column(Integer, nullable=False)
  created_at = Column(DateTime, server_default=func.now(), default=datetime.utcnow)

  user = relationship("User", back_populates="scores")
  level = relationship("Level", back_populates="scores")
