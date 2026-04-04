"""
Celery application factory for groove-ai worker.
"""

import os
from celery import Celery
from dotenv import load_dotenv

load_dotenv()

BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")

celery_app = Celery(
    "groove_ai_worker",
    broker=BROKER_URL,
    backend=RESULT_BACKEND,
    include=[
        "app.tasks.ingest_task",
        "app.tasks.parse_task",
        "app.tasks.embed_task",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    # Retry policy defaults
    task_max_retries=3,
    task_default_retry_delay=10,  # seconds
)
