import asyncio
from app.core.database import async_session
from sqlalchemy import text

async def probe():
    async with async_session() as db:
        try:
            # Query the actual column names from information_schema
            result = await db.execute(text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'repositories'
            """))
            cols = result.mappings().all()
            print("SCHEMA_START")
            for col in cols:
                print(f"COL: {col['column_name']} | TYPE: {col['data_type']} | NULL: {col['is_nullable']}")
            print("SCHEMA_END")
            
            # Check constraints too
            res2 = await db.execute(text("SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'repositories'::regclass"))
            print("CONSTRAINTS_START")
            for row in res2.all():
                print(f"CON: {row[0]} | DEF: {row[1]}")
            print("CONSTRAINTS_END")
            
        except Exception as e:
            print(f"Error probing schema: {str(e)}")

if __name__ == '__main__':
    asyncio.run(probe())
