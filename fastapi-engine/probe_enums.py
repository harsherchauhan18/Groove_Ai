import asyncio
from app.core.database import async_session
from sqlalchemy import text

async def probe():
    async with async_session() as db:
        try:
            # List all user defined types first to confirm ENUM name
            result = await db.execute(text("SELECT typname FROM pg_type WHERE typtype = 'e'"))
            enums = [row[0] for row in result.all()]
            print(f"ENUMS: {enums}")
            
            # Now probe values for the most likely repo status enum
            target = "enum_repositories_status"
            if target in enums:
                res2 = await db.execute(text(f"SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = '{target}'"))
                labels = [row[0] for row in res2.all()]
                print(f"LABELS: {labels}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == '__main__':
    asyncio.run(probe())
