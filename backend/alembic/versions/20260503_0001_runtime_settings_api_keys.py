"""runtime settings and hashed api keys

Revision ID: 20260503_0001
Revises:
Create Date: 2026-05-03
"""
from alembic import op
import sqlalchemy as sa

revision = "20260503_0001"
down_revision = None
branch_labels = None
depends_on = None


user_role = sa.Enum("USER", "STUDENT", "PRO", "ADMIN", name="userrole")
job_type = sa.Enum("COLORIZE", "VIDEO_COLORIZE", "RESTORE", "UPSCALE", name="jobtype")
job_status = sa.Enum("PENDING", "PROCESSING", "COMPLETED", "FAILED", name="jobstatus")


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def _columns(table_name: str) -> set[str]:
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table_name)}


def _indexes(table_name: str) -> set[str]:
    return {index["name"] for index in sa.inspect(op.get_bind()).get_indexes(table_name)}


def _create_index(table_name: str, index_name: str, columns: list[str], unique: bool = False) -> None:
    if table_name in _tables() and index_name not in _indexes(table_name):
        op.create_index(index_name, table_name, columns, unique=unique)


def upgrade() -> None:
    existing_tables = _tables()

    if "users" not in existing_tables:
        op.create_table(
            "users",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("email", sa.String(), nullable=False),
            sa.Column("password_hash", sa.String(), nullable=False),
            sa.Column("role", user_role, nullable=False),
            sa.Column("credits", sa.Integer(), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False),
            sa.Column("api_key", sa.String(), nullable=True),
            sa.Column("api_key_hash", sa.String(), nullable=True),
            sa.Column("api_key_last4", sa.String(length=4), nullable=True),
            sa.Column("api_key_created_at", sa.DateTime(), nullable=True),
            sa.Column("email_notifications", sa.Boolean(), nullable=False),
            sa.Column("theme", sa.String(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("email"),
            sa.UniqueConstraint("api_key"),
            sa.UniqueConstraint("api_key_hash"),
        )
    else:
        user_columns = _columns("users")
        with op.batch_alter_table("users") as batch:
            if "api_key_hash" not in user_columns:
                batch.add_column(sa.Column("api_key_hash", sa.String(), nullable=True))
            if "api_key_last4" not in user_columns:
                batch.add_column(sa.Column("api_key_last4", sa.String(length=4), nullable=True))

    _create_index("users", "ix_users_email", ["email"], unique=True)
    _create_index("users", "ix_users_api_key", ["api_key"], unique=True)
    _create_index("users", "ix_users_api_key_hash", ["api_key_hash"], unique=True)

    if "jobs" not in _tables():
        op.create_table(
            "jobs",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("user_id", sa.String(), nullable=False),
            sa.Column("type", job_type, nullable=False),
            sa.Column("status", job_status, nullable=False),
            sa.Column("input_path", sa.String(), nullable=False),
            sa.Column("output_path", sa.String(), nullable=True),
            sa.Column("processing_time", sa.Float(), nullable=True),
            sa.Column("error_message", sa.String(), nullable=True),
            sa.Column("device", sa.String(), nullable=True),
            sa.Column("render_factor", sa.Integer(), nullable=True),
            sa.Column("progress", sa.Integer(), nullable=True),
            sa.Column("is_favorite", sa.Boolean(), nullable=False),
            sa.Column("collection", sa.String(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
    _create_index("jobs", "ix_jobs_user_id", ["user_id"])
    _create_index("jobs", "ix_jobs_status", ["status"])
    _create_index("jobs", "ix_jobs_user_created", ["user_id", "created_at"])

    if "audit_logs" not in _tables():
        op.create_table(
            "audit_logs",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("admin_email", sa.String(), nullable=False),
            sa.Column("action", sa.String(), nullable=False),
            sa.Column("target", sa.String(), nullable=True),
            sa.Column("details", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )

    if "plans" not in _tables():
        op.create_table(
            "plans",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("gpu_access", sa.Boolean(), nullable=False),
            sa.Column("max_resolution", sa.Integer(), nullable=False),
            sa.Column("credits_per_month", sa.Integer(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("name"),
        )

    if "system_settings" not in _tables():
        op.create_table(
            "system_settings",
            sa.Column("key", sa.String(length=100), nullable=False),
            sa.Column("value", sa.Text(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint("key"),
        )


def downgrade() -> None:
    for table_name in ["system_settings", "plans", "audit_logs", "jobs", "users"]:
        if table_name in _tables():
            op.drop_table(table_name)

    job_status.drop(op.get_bind(), checkfirst=True)
    job_type.drop(op.get_bind(), checkfirst=True)
    user_role.drop(op.get_bind(), checkfirst=True)
