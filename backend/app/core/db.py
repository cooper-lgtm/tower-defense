from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import get_settings

settings = get_settings()

# SQLAlchemy 基础设施：Engine/Session/Base
engine = create_engine(settings.database_url, future=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)
Base = declarative_base()


def get_db():
  """FastAPI 依赖：提供一次性 Session。"""
  db = SessionLocal()
  try:
    yield db
  finally:
    db.close()
