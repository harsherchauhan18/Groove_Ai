import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

url = 'postgresql+asyncpg://neondb_owner:npg_9RyWmixN5ZIU@ep-delicate-tree-anzcxsrh.c-6.us-east-1.aws.neon.tech/neondb?ssl=require'

async def check():
    engine = create_async_engine(url)
    async with engine.connect() as conn:
        print("Checking tables...")
        try:
            res = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'"))
            tables = [r[0] for r in res.fetchall()]
            print("Tables:", tables)
        except Exception as e:
            print("Error listing tables:", e)
        
        print("\nChecking functions table...")
        try:
            res = await conn.execute(text("SELECT * FROM functions LIMIT 1"))
            print("Functions table exists and is accessible.")
        except Exception as e:
            print("Error accessing functions:", e)
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check())
