from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.db import Base, get_db
from app.core.deps import get_leaderboard
from app.main import app
from app.services.leaderboard import Leaderboard

# SQLite 内存数据库，用 StaticPool 保持同一实例。
TEST_DATABASE_URL = "sqlite+pysqlite:///:memory:"

engine = create_engine(
  TEST_DATABASE_URL,
  connect_args={"check_same_thread": False},
  poolclass=StaticPool,
  future=True,
)
TestingSessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)
test_leaderboard = Leaderboard(None)


@pytest.fixture(autouse=True, scope="function")
def _reset_db() -> Generator[None, None, None]:
  Base.metadata.drop_all(bind=engine)
  Base.metadata.create_all(bind=engine)
  test_leaderboard.fallback.clear()
  yield
  Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
  def override_db():
    db = TestingSessionLocal()
    try:
      yield db
      db.commit()
    finally:
      db.close()

  # 使用共享的内存版 Leaderboard，避免 Redis 依赖。
  app.dependency_overrides[get_db] = override_db
  app.dependency_overrides[get_leaderboard] = lambda: test_leaderboard

  with TestClient(app) as test_client:
    yield test_client

  app.dependency_overrides.clear()
