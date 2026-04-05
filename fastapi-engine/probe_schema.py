import asyncio
from app.core.database import async_session
from sqlalchemy import text

async def probe():
    async with async_session() as db:
        try:
            result = await db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'repositories'"))
            for row in result.all():
                print(f"COL: {row[0]}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == '__main__':
    asyncio.run(probe())
