"""
database.py — Async SQLAlchemy setup (SQLite via aiosqlite).
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from .config import settings


engine = create_async_engine(
    settings.DATABASE_URL, 
    echo=False, 
    future=True,
    connect_args={"timeout": 15}
)

AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


async def init_db():
    """Create all tables (called on startup)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    """FastAPI dependency: async DB session."""
    async with AsyncSessionLocal() as session:
        yield session
