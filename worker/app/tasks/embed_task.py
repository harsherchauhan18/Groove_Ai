"""
Embed Task
----------
Generates vector embeddings for parsed code chunks and stores them
in the FAISS index via the FastAPI engine.
"""

import os
import logging
import httpx
from app.config.celery_config import celery_app

logger = logging.getLogger(__name__)

FASTAPI_URL = os.getenv("FASTAPI_URL", "http://localhost:8000")


@celery_app.task(
    name="tasks.embed_repo",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
)
def embed_repo(self, repo_id: str):
    """
    Trigger embedding generation for all parsed chunks of a repository.

    The FastAPI engine handles the actual model inference and FAISS upsert;
    this task simply fires the request and waits for acknowledgement.

    Args:
        repo_id: Unique repository identifier.

    Returns:
        dict with embedding status from the engine.
    """
    try:
        with httpx.Client(timeout=120) as client:
            resp = client.post(
                f"{FASTAPI_URL}/api/embed/generate",
                json={"repo_id": repo_id},
            )
            resp.raise_for_status()
            result = resp.json()
    except httpx.HTTPError as exc:
        logger.error("HTTP error requesting embeddings for %s: %s", repo_id, exc)
        raise self.retry(exc=exc)

    logger.info("Embedding complete for %s: %s", repo_id, result)
    return {"status": "success", "repo_id": repo_id, **result}
