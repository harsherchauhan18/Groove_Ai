"""
Ingest Task
-----------
Clones or updates a GitHub repository into the local repos directory,
then triggers the parse pipeline.
"""

import os
import subprocess
import logging
from app.config.celery_config import celery_app

logger = logging.getLogger(__name__)

REPOS_BASE_DIR = os.getenv("REPOS_BASE_DIR", "./data/repos")


@celery_app.task(
    name="tasks.ingest_repo",
    bind=True,
    max_retries=3,
    default_retry_delay=15,
)
def ingest_repo(self, repo_url: str, repo_id: str):
    """
    Clone (or pull) a GitHub repository.

    Args:
        repo_url:  Full HTTPS clone URL, e.g. https://github.com/owner/repo.git
        repo_id:   Unique string identifier used for the local folder name.

    Returns:
        dict with status and local path.
    """
    local_path = os.path.join(REPOS_BASE_DIR, repo_id)
    os.makedirs(REPOS_BASE_DIR, exist_ok=True)

    try:
        if os.path.isdir(os.path.join(local_path, ".git")):
            logger.info("Pulling latest changes for %s", repo_id)
            subprocess.run(
                ["git", "-C", local_path, "pull", "--ff-only"],
                check=True,
                capture_output=True,
            )
        else:
            logger.info("Cloning %s → %s", repo_url, local_path)
            subprocess.run(
                ["git", "clone", "--depth=1", repo_url, local_path],
                check=True,
                capture_output=True,
            )

        logger.info("Ingest complete: %s", local_path)
        return {"status": "success", "repo_id": repo_id, "path": local_path}

    except subprocess.CalledProcessError as exc:
        logger.error("Git error for %s: %s", repo_id, exc.stderr)
        raise self.retry(exc=exc)
    except Exception as exc:
        logger.exception("Unexpected error ingesting %s", repo_id)
        raise self.retry(exc=exc)
