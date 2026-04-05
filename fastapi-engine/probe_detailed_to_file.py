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
            with open("probe_output.txt", "w") as f:
                f.write("SCHEMA_START\n")
                for col in cols:
                    f.write(f"COL: {col['column_name']} | TYPE: {col['data_type']} | NULL: {col['is_nullable']}\n")
                f.write("SCHEMA_END\n")
                
                # Check constraints too
                res2 = await db.execute(text("SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'repositories'::regclass"))
                f.write("CONSTRAINTS_START\n")
                for row in res2.all():
                    f.write(f"CON: {row[0]} | DEF: {row[1]}\n")
                f.write("CONSTRAINTS_END\n")
            print("DONE_SAVED_TO_FILE")
        except Exception as e:
            print(f"Error probing schema: {str(e)}")

if __name__ == '__main__':
    asyncio.run(probe())
