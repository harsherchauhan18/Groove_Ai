import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

url = 'postgresql+asyncpg://neondb_owner:npg_9RyWmixN5ZIU@ep-delicate-tree-anzcxsrh.c-6.us-east-1.aws.neon.tech/neondb?ssl=require'

async def setup():
    engine = create_async_engine(url)
    async with engine.connect() as conn:
        print("Creating functions table...")
        # Enable pgcrypto for gen_random_uuid() if not available, OR use uuid_generate_v4()
        # On Neon, gen_random_uuid is usually available.
        try:
            await conn.execute(text('CREATE EXTENSION IF NOT EXISTS "pgcrypto"'))
            await conn.execute(text('''
                CREATE TABLE IF NOT EXISTS functions (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    "repoId" UUID REFERENCES repositories(id),
                    "filePath" TEXT,
                    name TEXT,
                    "startLine" INTEGER,
                    "endLine" INTEGER,
                    "createdAt" TIMESTAMP DEFAULT NOW()
                )
            '''))
            await conn.commit()
            print("Table functions created.")
        except Exception as e:
            print("Error creating table:", e)
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(setup())
