import asyncio
import uuid
import sys
from app.core.database import async_session
from sqlalchemy import text

async def test_insert():
    async with async_session() as db:
        repo_id = str(uuid.uuid4())
        repo_url = "https://github.com/test/repo_" + str(uuid.uuid4())[:8]
        user_id = "00000000-0000-0000-0000-000000000000"
        name = "repo"
        try:
            print("TRYING_INSERT...")
            await db.execute(
                text('''
                    INSERT INTO repositories (id, "userId", name, url, status, "createdAt", "updatedAt")
                    VALUES (:id, :user_id, :name, :url, 'processing', NOW(), NOW())
                '''),
                {"id": repo_id, "user_id": user_id, "name": name, "url": repo_url}
            )
            await db.commit()
            print(f"SUCCESS:{repo_id}")
        except Exception as e:
            print(f"FAILED:{str(e)}")

if __name__ == '__main__':
    asyncio.run(test_insert())
