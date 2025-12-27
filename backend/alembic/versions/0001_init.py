"""init tables

Revision ID: 0001_init
Revises:
Create Date: 2024-12-27
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0001_init"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
  op.create_table(
    "users",
    sa.Column("id", sa.Integer, primary_key=True),
    sa.Column("name", sa.String, unique=True, nullable=False, index=True),
    sa.Column("hash_pwd", sa.String, nullable=False),
    sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
  )

  op.create_table(
    "levels",
    sa.Column("id", sa.String, primary_key=True),
    sa.Column("config_json", sa.JSON, nullable=False),
    sa.Column("version", sa.String, nullable=False),
    sa.Column("hash", sa.String, nullable=False, index=True),
    sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
  )

  op.create_table(
    "scores",
    sa.Column("id", sa.Integer, primary_key=True),
    sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False, index=True),
    sa.Column("level_id", sa.String, sa.ForeignKey("levels.id"), nullable=False, index=True),
    sa.Column("score", sa.Integer, nullable=False),
    sa.Column("wave", sa.Integer, nullable=False),
    sa.Column("time_ms", sa.Integer, nullable=False),
    sa.Column("life_left", sa.Integer, nullable=False),
    sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
  )


def downgrade():
  op.drop_table("scores")
  op.drop_table("levels")
  op.drop_table("users")
