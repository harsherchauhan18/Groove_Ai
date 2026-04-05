import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

async def debug():
    db_url = os.getenv('DATABASE_URL', '').replace('postgresql+asyncpg://', 'postgresql://')
    conn = await asyncpg.connect(db_url)
    repo_id = 'e4e96cc2-3887-46e8-b5c4-2f761c00d419'
    
    with open('output_functions.txt', 'w', encoding='utf-8') as f:
        f.write("--- functions table ---\n")
        res = await conn.fetch('''
            SELECT name, "filePath"
            FROM functions
            WHERE "repoId" = $1 AND "filePath" LIKE '%[id]%'
        ''', repo_id)
        for r in res:
            f.write(f"fn: {r['name']} | file: {r['filePath']}\n")
            
    await conn.close()

if __name__ == "__main__":
    asyncio.run(debug())
