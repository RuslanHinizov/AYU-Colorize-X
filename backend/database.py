from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker, declarative_base
from config import settings
import os

# Use SQLite for local development (easier setup)
# For production, use PostgreSQL from settings.DATABASE_URL
if os.getenv("USE_SQLITE", "true").lower() == "true":
    SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///./ayu_colorize.db"
else:
    SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()

async def ensure_sqlite_dev_schema(conn):
    """Patch additive SQLite schema changes for local dev databases.

    Production uses Alembic. SQLite create_all() does not add columns to
    existing tables, so local users with an old ayu_colorize.db need this
    small additive repair path.
    """
    if "sqlite" not in SQLALCHEMY_DATABASE_URL:
        return

    result = await conn.execute(text("PRAGMA table_info(users)"))
    columns = {row[1] for row in result.fetchall()}

    if "api_key_hash" not in columns:
        await conn.execute(text("ALTER TABLE users ADD COLUMN api_key_hash VARCHAR"))
    if "api_key_last4" not in columns:
        await conn.execute(text("ALTER TABLE users ADD COLUMN api_key_last4 VARCHAR(4)"))

    await conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_api_key_hash ON users (api_key_hash)"))

async def get_db():
    async with SessionLocal() as session:
        yield session

