import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Fetch database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Use development URL as fallback
    DATABASE_URL = "postgresql+asyncpg://neondb_owner:npg_9RyWmixN5ZIU@ep-delicate-tree-anzcxsrh.c-6.us-east-1.aws.neon.tech/neondb?ssl=require"

async def create_functions_table():
    """
    Creates the functions table in the PostgreSQL database if it does not already exist.
    """
    logger.info("Initializing functions table creation...")
    engine = create_async_engine(DATABASE_URL, echo=True)

    async with engine.begin() as conn:
        logger.info("Executing CREATE TABLE statement...")
        await conn.execute(text('''
            CREATE TABLE IF NOT EXISTS functions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                repo_id UUID NOT NULL,
                file_path TEXT NOT NULL,
                name TEXT NOT NULL,
                start_line INTEGER NOT NULL,
                end_line INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        '''))
        
        logger.info("Creating index on repo_id for optimized lookups...")
        await conn.execute(text('CREATE INDEX IF NOT EXISTS idx_functions_repo_id ON functions (repo_id)'))
        
        logger.info("Migration successful: functions table created.")

    await engine.dispose()

if __name__ == "__main__":
    try:
        asyncio.run(create_functions_table())
    except Exception as e:
        logger.error(f"Migration failed: {e}")
