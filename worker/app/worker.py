"""
groove-ai Celery Worker
Entry point — import all task modules so Celery auto-discovers them.
"""

from app.config.celery_config import celery_app  # noqa: F401

# Import tasks so Celery registers them
import app.tasks.ingest_task  # noqa: F401
import app.tasks.parse_task   # noqa: F401
import app.tasks.embed_task   # noqa: F401

if __name__ == "__main__":
    celery_app.start()
