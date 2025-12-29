"""
Bootstrap helper: ensure DB role+database exist, then run Alembic migrations.

Usage (inside container or host venv):
  python scripts/bootstrap_db.py

Order:
- Best-effort connect to admin DB using TD creds, DB_ADMIN_* env, POSTGRES_* env, or postgres/postgres fallback.
- Ensure target role exists (creates with password from TD_DATABASE_URL).
- Ensure target database exists (owner set to target role).
- Run `alembic upgrade head`.
"""

import os
import subprocess
from typing import Tuple

import psycopg2
from psycopg2 import sql
from sqlalchemy.engine.url import make_url

from app.core.config import get_settings


def get_admin_connection(db_url: str) -> Tuple[psycopg2.extensions.connection, str]:
  """Return a connection to the maintenance DB using best-effort admin creds."""
  url = make_url(db_url)
  host = url.host or "db"
  port = url.port or 5432

  candidates = []
  if url.username and url.password:
    candidates.append((url.username, url.password, "TD_DATABASE_URL user"))

  admin_user = os.getenv("DB_ADMIN_USER")
  admin_password = os.getenv("DB_ADMIN_PASSWORD")
  if admin_user and admin_password:
    candidates.append((admin_user, admin_password, "DB_ADMIN_* env"))

  pg_user = os.getenv("POSTGRES_USER")
  pg_password = os.getenv("POSTGRES_PASSWORD")
  if pg_user and pg_password:
    candidates.append((pg_user, pg_password, "POSTGRES_* env"))

  candidates.append(("postgres", "postgres", "default postgres/postgres"))

  last_exc = None
  for user, password, label in candidates:
    try:
      conn = psycopg2.connect(
        dbname="postgres",
        user=user,
        password=password,
        host=host,
        port=port,
      )
      print(f"[bootstrap] Connected to admin DB as {user} ({label})")
      return conn, user
    except Exception as exc:  # noqa: BLE001
      last_exc = exc
      continue

  raise last_exc if last_exc else RuntimeError("No admin credentials available")


def ensure_role_exists(conn, role: str, password: str):
  cur = conn.cursor()
  cur.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", (role,))
  exists = cur.fetchone()
  if not exists:
    cur.execute(
      sql.SQL("CREATE ROLE {} WITH LOGIN PASSWORD %s").format(sql.Identifier(role)),
      (password,),
    )
    print(f"[bootstrap] Created role {role}")
  else:
    print(f"[bootstrap] Role {role} already exists")
  cur.close()


def ensure_database_exists(conn, db_name: str, owner: str):
  cur = conn.cursor()
  cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (db_name,))
  exists = cur.fetchone()
  if not exists:
    cur.execute(
      sql.SQL('CREATE DATABASE {} OWNER {}').format(
        sql.Identifier(db_name),
        sql.Identifier(owner),
      )
    )
    print(f"[bootstrap] Created database {db_name} (owner {owner})")
  else:
    print(f"[bootstrap] Database {db_name} already exists; ensuring owner {owner}")
    cur.execute(
      sql.SQL("ALTER DATABASE {} OWNER TO {}").format(
        sql.Identifier(db_name),
        sql.Identifier(owner),
      )
    )
  cur.close()


def run_migrations():
  subprocess.check_call(["alembic", "upgrade", "head"])


def main():
  settings = get_settings()
  url = make_url(settings.database_url)

  conn, admin_user = get_admin_connection(settings.database_url)
  conn.autocommit = True
  try:
    ensure_role_exists(conn, url.username, url.password)
    ensure_database_exists(conn, url.database, url.username)
  finally:
    conn.close()

  run_migrations()
  print(f"[bootstrap] Done (via admin {admin_user}).")


if __name__ == "__main__":
  main()
