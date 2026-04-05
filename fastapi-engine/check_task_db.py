import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

async def debug():
    db_url = os.getenv('DATABASE_URL', '').replace('postgresql+asyncpg://', 'postgresql://')
    conn = await asyncpg.connect(db_url)
    
    print("--- 1. Repositories in DB ---")
    rows = await conn.fetch('SELECT id, name, status, "createdAt", "updatedAt" FROM repositories ORDER BY "updatedAt" DESC LIMIT 5')
    for r in rows:
        print(f"{r['name']} - {r['status']}")
            
    await conn.close()

if __name__ == "__main__":
    asyncio.run(debug())
