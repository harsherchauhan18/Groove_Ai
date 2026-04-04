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
        print("Checking tables...")
        tables = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
        for row in tables:
            print(f"Table: {row[0]}")
            
        print("\nChecking repositories columns...")
        cols = await conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'repositories'"))
        for row in cols:
            print(f"Col: {row[0]} ({row[1]})")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
