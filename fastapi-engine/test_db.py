import asyncio
from app.core.database import async_session
from sqlalchemy import text

async def main():
    async with async_session() as db:
        try:
            # Check constraints
            result = await db.execute(text("SELECT conname FROM pg_constraint WHERE conrelid = 'repositories'::regclass"))
            print(f"CONSTRAINTS: {[row[0] for row in result.all()]}")
            
            # Check for existing data
            result2 = await db.execute(text("SELECT id, \"userId\", url FROM repositories LIMIT 5"))
            print(f"EXISTING_DATA: {[dict(row) for row in result2.mappings()]}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == '__main__':
    asyncio.run(main())
