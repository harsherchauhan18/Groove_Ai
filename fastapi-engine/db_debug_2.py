import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

async def debug():
    db_url = os.getenv('DATABASE_URL', '').replace('postgresql+asyncpg://', 'postgresql://')
    conn = await asyncpg.connect(db_url)
    repo_id = 'e4e96cc2-3887-46e8-b5c4-2f761c00d419'
    
    with open('output.txt', 'w', encoding='utf-8') as f:
        f.write("--- 1. code_chunks matching src/app/profile/[id]% ---\n")
        rows = await conn.fetch('''
            SELECT DISTINCT "filePath", extension
            FROM code_chunks 
            WHERE "repoId" = $1 AND "filePath" LIKE '%src/app/profile%'
            LIMIT 10
        ''', repo_id)
        for r in rows:
            f.write(f"chunk: {r['filePath']} (ext: {r['extension']})\n")

        f.write("\n--- 2. Graph visualizer simulated output ---\n")
        res = await conn.fetch('''
            SELECT DISTINCT "filePath"
            FROM code_chunks
            WHERE "repoId" = $1
        ''', repo_id)
        files = [r['filePath'] for r in res]
        for fp in files:
            if 'profile' in fp:
                f.write(f"Found in db: {fp}\n")
            
    await conn.close()

if __name__ == "__main__":
    asyncio.run(debug())
