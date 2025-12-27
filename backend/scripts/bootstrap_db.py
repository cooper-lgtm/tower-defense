"""
Bootstrap helper: ensure database exists, then run Alembic migrations.

Usage:
  source ../.venv/bin/activate  # ensure venv active
  python scripts/bootstrap_db.py

It will:
- Parse TD_DATABASE_URL (or default from config) as target DB.
- Connect to the server's "postgres" maintenance DB and create the target DB if absent.
- Run `alembic upgrade head`.
"""

import subprocess

import psycopg2
from sqlalchemy.engine.url import make_url

from app.core.config import get_settings


def ensure_database_exists(db_url: str):
  url = make_url(db_url)
  db_name = url.database

  admin_url = url.set(database="postgres")
  conn = psycopg2.connect(
    dbname=admin_url.database,
    user=admin_url.username,
    password=admin_url.password,
    host=admin_url.host,
    port=admin_url.port,
  )
  conn.autocommit = True
  cur = conn.cursor()
  cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (db_name,))
  exists = cur.fetchone()
  if not exists:
    cur.execute(f'CREATE DATABASE "{db_name}"')
    print(f"[bootstrap] Created database {db_name}")
  else:
    print(f"[bootstrap] Database {db_name} already exists")
  cur.close()
  conn.close()


def run_migrations():
  subprocess.check_call(["alembic", "upgrade", "head"])


def main():
  settings = get_settings()
  ensure_database_exists(settings.database_url)
  run_migrations()
  print("[bootstrap] Done.")


if __name__ == "__main__":
  main()
