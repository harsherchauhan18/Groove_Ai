"""
Parse Task
----------
Walks a cloned repository, reads source files, chunks them, and
stores the raw code chunks in PostgreSQL via the FastAPI engine.
"""

import os
import logging
import httpx
from app.config.celery_config import celery_app

logger = logging.getLogger(__name__)

FASTAPI_URL = os.getenv("FASTAPI_URL", "http://localhost:8000")
REPOS_BASE_DIR = os.getenv("REPOS_BASE_DIR", "./data/repos")

# File extensions to index
SUPPORTED_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx",
    ".java", ".go", ".rs", ".cpp", ".c", ".h",
    ".rb", ".php", ".cs", ".swift", ".kt",
    ".md", ".txt", ".yaml", ".yml", ".json", ".toml",
}


def _walk_repo(repo_path: str) -> list[dict]:
    """Return a list of {path, content} dicts for all supported source files."""
    chunks = []
    for root, dirs, files in os.walk(repo_path):
        # Skip hidden / dependency directories
        dirs[:] = [
            d for d in dirs
            if not d.startswith(".") and d not in {"node_modules", "__pycache__", "venv", ".venv"}
        ]
        for fname in files:
            ext = os.path.splitext(fname)[1].lower()
            if ext not in SUPPORTED_EXTENSIONS:
                continue
            fpath = os.path.join(root, fname)
            try:
                with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                chunks.append({
                    "file_path": os.path.relpath(fpath, repo_path),
                    "content": content,
                    "extension": ext,
                })
            except OSError:
                pass
    return chunks


@celery_app.task(
    name="tasks.parse_repo",
    bind=True,
    max_retries=3,
    default_retry_delay=20,
)
def parse_repo(self, repo_id: str):
    """
    Walk a cloned repository and send parsed file chunks to the FastAPI engine.

    Args:
        repo_id: Identifier matching the folder name under REPOS_BASE_DIR.

    Returns:
        dict with file count processed.
    """
    local_path = os.path.join(REPOS_BASE_DIR, repo_id)
    if not os.path.isdir(local_path):
        raise FileNotFoundError(f"Repo path not found: {local_path}")

    chunks = _walk_repo(local_path)
    total_files = len(chunks)
    batch_size = 50
    logger.info("Parsed %d files for repo %s. Sending in batches of %d.", total_files, repo_id, batch_size)

    try:
        with httpx.Client(timeout=60) as client:
            # 1. Store chunks in batches
            for i in range(0, total_files, batch_size):
                batch = chunks[i : i + batch_size]
                logger.info("Sending batch %d/%d for %s", (i // batch_size) + 1, (total_files // batch_size) + 1, repo_id)
                resp = client.post(
                    f"{FASTAPI_URL}/api/parse/store",
                    json={"repo_id": repo_id, "chunks": batch},
                )
                resp.raise_for_status()

            # 2. Signal completion to start Graph/Embed pipeline
            logger.info("All batches sent for %s. Triggering post-processing.", repo_id)
            resp = client.post(
                f"{FASTAPI_URL}/api/parse/complete",
                json={"repo_id": repo_id},
            )
            resp.raise_for_status()

    except httpx.HTTPError as exc:
        logger.error("HTTP error sending parse results for %s: %s", repo_id, exc)
        raise self.retry(exc=exc)

    return {"status": "success", "repo_id": repo_id, "files_parsed": total_files}
