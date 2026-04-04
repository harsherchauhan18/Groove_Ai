import asyncio
import ssl
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

db_url = "postgresql+asyncpg://neondb_owner:npg_9RyWmixN5ZIU@ep-delicate-tree-anzcxsrh.c-6.us-east-1.aws.neon.tech/neondb"
ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE
engine = create_async_engine(db_url, connect_args={"ssl": ssl_ctx})

async def main():
    async with engine.begin() as conn:
        # asyncpg does not allow multiple statements in one execute()
        print("Ensuring uuid-ossp extension...")
        await conn.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'))
        
        print("Creating code_chunks table...")
        await conn.execute(text('''
            CREATE TABLE IF NOT EXISTS code_chunks (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                "repoId" UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
                "filePath" TEXT NOT NULL,
                extension TEXT,
                content TEXT NOT NULL,
                "chunkIndex" INTEGER NOT NULL,
                "embeddingId" TEXT,
                "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        '''))
        
        print("Ensuring embeddingId column exists...")
        await conn.execute(text('ALTER TABLE code_chunks ADD COLUMN IF NOT EXISTS "embeddingId" TEXT;'))
        
        print("Done.")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
