import asyncio
import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

load_dotenv()

async def run():
    engine = create_async_engine(os.getenv('DATABASE_URL'))
    
    async with engine.connect() as conn:
        print("=== code_chunks ===")
        res = await conn.execute(text('SELECT DISTINCT "filePath" FROM code_chunks LIMIT 5'))
        for r in res:
            print(r.filePath)
            
        print("\n=== functions ===")
        res2 = await conn.execute(text('SELECT DISTINCT "filePath" FROM functions LIMIT 5'))
        for r in res2:
            print(r.filePath)
            
    await engine.dispose()

asyncio.run(run())
