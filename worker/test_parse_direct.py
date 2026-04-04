"""
Manual test of the parse process (No Celery).
"""
import os
import sys
import httpx

# Add worker to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), ".")))

# Set environment
os.environ["FASTAPI_URL"] = "http://localhost:8000"
os.environ["REPOS_BASE_DIR"] = "./data/repos"

import logging
logging.basicConfig(level=logging.INFO)

from app.tasks.parse_task import parse_repo

# Use the repo we just cloned in the direct test
REPO_ID = "5fee43d9-5ed5-4605-b71f-935cad88e5b8"

print(f"Starting direct parse for {REPO_ID}...")
try:
    # use apply() to run synchronously
    task_result = parse_repo.apply(args=(REPO_ID,))
    print(f"Task status: {task_result.state}")
    print(f"Result: {task_result.result}")
except Exception as e:
    print(f"Caught error: {e}")
    import traceback
    traceback.print_exc()
