import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

async def debug():
    db_url = os.getenv('DATABASE_URL', '').replace('postgresql+asyncpg://', 'postgresql://')
    conn = await asyncpg.connect(db_url)
    
    with open('task_status.txt', 'w', encoding='utf-8') as f:
        f.write("--- Repositories (Recent 3) ---\n")
        repos = await conn.fetch('''SELECT "repoName", "parseStatus", "createdAt" FROM repositories ORDER BY "createdAt" DESC LIMIT 3''')
        for r in repos:
            f.write(f"Repo: {r['repoName']} | Status: {r['parseStatus']} | Time: {r['createdAt']}\n")
            
    await conn.close()

if __name__ == "__main__":
    asyncio.run(debug())
