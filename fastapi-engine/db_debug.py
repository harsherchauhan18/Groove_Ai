import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

async def debug():
    # Use standard postgresql:// for asyncpg
    db_url = os.getenv('DATABASE_URL', '').replace('postgresql+asyncpg://', 'postgresql://')
    conn = await asyncpg.connect(db_url)
    
    print("--- 1. Any repoId from code_chunks ---")
    row = await conn.fetchrow('SELECT "repoId" FROM code_chunks LIMIT 1')
    if not row:
        print("No code chunks found in DB!")
        return
        
    repo_id = row['repoId']
    print(f"Using repoId: {repo_id}")
    
    print("\n--- 2. Top 5 filePaths in DB for this repo ---")
    rows = await conn.fetch('SELECT DISTINCT "filePath" FROM code_chunks WHERE "repoId" = $1 LIMIT 5', repo_id)
    raw_paths = [r['filePath'] for r in rows]
    for r in raw_paths:
        print(f"'{r}'")
        
    print("\n--- 3. Top 5 activeNodeId / filePath in functions (if any) ---")
    fn_rows = await conn.fetch('SELECT name, "filePath", "startLine" FROM functions WHERE "repoId" = $1 LIMIT 5', repo_id)
    for f in fn_rows:
        print(f"fn={f['name']}, path='{f['filePath']}', start={f['startLine']}")

    await conn.close()

if __name__ == "__main__":
    asyncio.run(debug())
