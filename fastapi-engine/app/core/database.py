import ssl
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import get_settings

settings = get_settings()

# asyncpg does not understand ?sslmode=require from the standard pg URL.
# We need to pass an ssl context explicitly for Neon (cloud PostgreSQL).
db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://")

connect_args = {}

if "sslmode=" in db_url or "ssl=" in db_url:
    # Strip sslmode from URL and pass it as connect_args instead
    db_url = db_url.split("?")[0]  # Remove query params
    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE
    connect_args["ssl"] = ssl_ctx

engine = create_async_engine(
    db_url,
    echo=settings.DEBUG,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_recycle=3600
)

async_session = async_sessionmaker(
    engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

async def get_db():
    """Dependency for getting async session"""
    async with async_session() as session:
        yield session
