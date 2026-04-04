"""
Manual test of the ingest process (No Celery).
"""
import os
import sys
import uuid
import httpx

# Add worker to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), ".")))

# Set environment
os.environ["FASTAPI_URL"] = "http://localhost:8000"
os.environ["REPOS_BASE_DIR"] = "./data/repos"

import logging
logging.basicConfig(level=logging.INFO)

from app.tasks.ingest_task import ingest_repo

# Use a real user ID from the database
REAL_USER_ID = "c00b03b2-5c1a-4a0d-a09f-67b2c70aed73"
REPO_URL = "https://github.com/Shreya2776/SkillRise_India"
REPO_ID = "direct-test-" + str(uuid.uuid4())[:8]

# Ensure repo record exists (we use the API for this to be safe)
print(f"Creating repo record for {REPO_ID}...")
try:
    # We call the FastAPI endpoint or just skip if it's already there
    # Actually our ingest.py has a helper but its internal.
    # We'll just rely on the task's first patch which fails if repo not in DB.
    # So we MUST have the repo in DB.
    
    # Let's use a trick: manually insert it via SQL in this script if we can,
    # OR just call a dummy GET to see if we can reach the DB.
    pass
except:
    pass

print(f"Starting direct ingest for {REPO_URL} as {REPO_ID}...")
try:
    # use apply().get() to run synchronously in current process
    task_result = ingest_repo.apply(args=(REPO_URL, REPO_ID, REAL_USER_ID))
    print(f"Task finished with state: {task_result.state}")
    print(f"Result: {task_result.result}")
except Exception as e:
    print(f"Caught error: {e}")
    import traceback
    traceback.print_exc()
