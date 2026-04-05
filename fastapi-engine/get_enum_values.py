import asyncio
from app.core.database import async_session
from sqlalchemy import text

async def probe():
    async with async_session() as db:
        try:
            # Get the exact enum name from the information_schema
            result = await db.execute(text("SELECT udt_name FROM information_schema.columns WHERE table_name = 'repositories' AND column_name = 'status'"))
            enum_name = result.scalar()
            print(f"ENUM_NAME: {enum_name}")
            
            # Get the values for that enum
            result2 = await db.execute(text(f"SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = '{enum_name}'"))
            labels = [row[0] for row in result2.all()]
            print(f"LABELS: {labels}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == '__main__':
    asyncio.run(probe())
