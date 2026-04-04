"""
Quick test script to trigger ingestion and verify the pipeline.
Uses a real user ID from the database.
"""
import jwt
import datetime
import httpx
import time
import asyncio
import ssl
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

JWT_SECRET = "96b24d0305e58197c9ef40b5c85057d657afe5dfc7e783b1c76a081a5f2ac833"
FASTAPI_URL = "http://localhost:8000"
REPO_URL = "https://github.com/Shreya2776/SkillRise_India"

# Real user from the database
REAL_USER_ID = "c00b03b2-5c1a-4a0d-a09f-67b2c70aed73"

# 1. First, clean up any stuck repos by resetting status
print("[0] Cleaning up stuck repos...")
db_url = "postgresql+asyncpg://neondb_owner:npg_9RyWmixN5ZIU@ep-delicate-tree-anzcxsrh.c-6.us-east-1.aws.neon.tech/neondb"
ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

async def cleanup():
    engine = create_async_engine(db_url, connect_args={"ssl": ssl_ctx})
    async with engine.begin() as conn:
        # Delete old stuck repos so we can re-ingest cleanly
        await conn.execute(text(
            "DELETE FROM repositories WHERE url = :url AND status IN ('cloning', 'pending')"
        ), {"url": REPO_URL})
    await engine.dispose()

asyncio.run(cleanup())
print("    Cleaned up stuck repos.")

# 2. Generate a JWT for the real user
token = jwt.encode(
    {
        "id": REAL_USER_ID,
        "email": "fakeharsh567@gmail.com",
        "iat": datetime.datetime.now(datetime.UTC),
        "exp": datetime.datetime.now(datetime.UTC) + datetime.timedelta(hours=1),
    },
    JWT_SECRET,
    algorithm="HS256",
)
print(f"[1] Generated JWT for user {REAL_USER_ID[:8]}...")

headers = {"Authorization": f"Bearer {token}"}

with httpx.Client(timeout=30) as client:
    # 3. Health check
    resp = client.get(f"{FASTAPI_URL}/health")
    print(f"[2] Health: {resp.json()}")

    # 4. List repos before
    resp = client.get(f"{FASTAPI_URL}/api/ingest/")
    print(f"[3] Repos before: {resp.status_code}")
    for r in resp.json():
        print(f"    - {r.get('name')}: {r.get('status')}")

    # 5. Trigger clone
    print(f"\n[4] POST /api/ingest/clone ...")
    resp = client.post(
        f"{FASTAPI_URL}/api/ingest/clone",
        json={"url": REPO_URL},
        headers=headers,
    )
    print(f"    Response: {resp.status_code}")
    if resp.status_code == 200:
        result = resp.json()
        print(f"    {result}")
        repo_id = result.get("repo_id")
    else:
        print(f"    ERROR: {resp.text[:500]}")
        repo_id = None

    # 6. Poll status
    if repo_id:
        print(f"\n[5] Polling repo {repo_id[:8]}... (up to 120s)")
        for i in range(24):
            time.sleep(5)
            resp = client.get(f"{FASTAPI_URL}/api/ingest/")
            if resp.status_code == 200:
                repos = resp.json()
                target = [r for r in repos if r.get("id") == repo_id]
                if target:
                    st = target[0].get("status", "?")
                    print(f"    [{(i+1)*5:3d}s] {st}")
                    if st in ("completed", "failed"):
                        print(f"\n    === PIPELINE FINISHED: {st} ===")
                        break
                else:
                    print(f"    [{(i+1)*5:3d}s] not found yet")
            else:
                print(f"    [{(i+1)*5:3d}s] error {resp.status_code}")

print("\n[Done]")
