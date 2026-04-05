from fastapi import APIRouter, Depends, HTTPException, Body
from app.core.security import verify_token
from app.config.celery_config import celery_app
from app.core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel, HttpUrl
import uuid
from typing import Optional

import logging
import traceback
logger = logging.getLogger(__name__)

router = APIRouter()

class IngestRequest(BaseModel):
    url: HttpUrl

@router.post("/clone")
async def clone_repo(
    payload: IngestRequest, 
    user=Depends(verify_token)
):
    """
    Triggers the background task to clone and analyze a GitHub repository.
    """
    repo_url = str(payload.url)
    repo_id = str(uuid.uuid4())
    user_id = user.get("id")
    
    try:
        # Insert a new repository record into the DB
        await _create_repo_record(repo_id, user_id, repo_url)
        
        # Dispatched to Celery (worker/app/tasks/ingest_task.py)
        task = celery_app.send_task(
            "tasks.ingest_repo", 
            args=[repo_url, repo_id, user_id],
            task_id=f"ingest-{repo_id}"
        )
        
        return {
            "status": "accepted",
            "task_id": task.id,
            "repo_id": repo_id,
            "message": f"Cloning of {repo_url} has been queued."
        }
    except Exception as e:
        logger.error(f"Error in clone_repo: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to queue ingestion: {str(e)}")


async def _create_repo_record(repo_id: str, user_id: str, repo_url: str):
    """Helper: insert a repo row so status updates and listing work immediately."""
    from app.core.database import async_session
    # Extract repo name from URL (e.g. "SkillRise_India" from "https://github.com/user/SkillRise_India")
    name = repo_url.rstrip("/").split("/")[-1]
    async with async_session() as db:
        await db.execute(
            text('''
                INSERT INTO repositories (id, "userId", name, url, status, "createdAt", "updatedAt")
                VALUES (:id, :user_id, :name, :url, 'pending', NOW(), NOW())
                ON CONFLICT (id) DO NOTHING
            '''),
            {"id": repo_id, "user_id": user_id, "name": name, "url": repo_url}
        )
        await db.commit()


@router.get("/")
async def get_repositories(user=Depends(verify_token), db: AsyncSession = Depends(get_db)):
    """
    Get all repositories for the current user.
    """
    try:
        user_id = user.get("id")
        result = await db.execute(
            text('SELECT id, name, url, status, "lastAnalyzedAt", "createdAt", "updatedAt" FROM repositories WHERE "userId" = CAST(:user_id AS uuid) ORDER BY "updatedAt" DESC'),
            {"user_id": user_id}
        )
        repos = result.mappings().all()
        return [dict(r) for r in repos]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class StatusUpdateRequest(BaseModel):
    status: str
    message: Optional[str] = None

@router.patch("/status/{repo_id}")
async def update_status(
    repo_id: str,
    payload: StatusUpdateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Internal endpoint for workers to update repo status.
    """
    try:
        await db.execute(
            text('UPDATE repositories SET status = :status, "updatedAt" = NOW() WHERE id = :repo_id'),
            {"status": payload.status, "repo_id": repo_id}
        )
        await db.commit()
        return {"message": "Status updated"}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in update_status: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))
