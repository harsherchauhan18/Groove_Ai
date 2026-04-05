import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

async def debug():
    db_url = os.getenv('DATABASE_URL', '').replace('postgresql+asyncpg://', 'postgresql://')
    conn = await asyncpg.connect(db_url)
    repo_id = 'e4e96cc2-3887-46e8-b5c4-2f761c00d419'
    
    print("--- 1. code_chunks matching src/app/profile/[id]% ---")
    rows = await conn.fetch('''
        SELECT DISTINCT "filePath", extension
        FROM code_chunks 
        WHERE "repoId" = $1 AND "filePath" LIKE '%src/app/profile/[id]%'
        LIMIT 10
    ''', repo_id)
    for r in rows:
        print(f"chunk: {r['filePath']} (ext: {r['extension']})")

    print("\n--- 2. code_chunks exact match ---")
    rows_exact = await conn.fetch('''
        SELECT COUNT(*)
        FROM code_chunks
        WHERE "repoId" = $1 AND "filePath" = $2
    ''', repo_id, 'src/app/profile/[id]')
    print(f"Exact match count: {rows_exact[0]['count']}")

    print("\n--- 3. Graph visualizer simulated output ---")
    res = await conn.fetch('''
        SELECT DISTINCT "filePath"
        FROM code_chunks
        WHERE "repoId" = $1
    ''', repo_id)
    files = [r['filePath'] for r in res]
    for fp in files:
        if 'profile' in fp:
            print(f"Found in db: {fp}")
            
    await conn.close()

if __name__ == "__main__":
    asyncio.run(debug())
