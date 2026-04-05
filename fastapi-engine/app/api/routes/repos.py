from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, HttpUrl
import uuid
import logging
from sqlalchemy import text
from app.core.security import verify_token
from app.core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.config.celery_config import celery_app

logger = logging.getLogger(__name__)

router = APIRouter()

class RepoCreateRequest(BaseModel):
    repo_url: HttpUrl

@router.get("/")
async def list_repositories(db: AsyncSession = Depends(get_db)):
    try:
        # Aligning exactly with ingest.py: selective columns + "updatedAt"
        result = await db.execute(
            text("""
                SELECT id, name, url, status, "lastAnalyzedAt", "createdAt", "updatedAt"
                FROM repositories
                ORDER BY "updatedAt" DESC
            """)
        )
        repos = result.mappings().all()
        return [dict(r) for r in repos]
    except Exception as e:
        logger.error(f"Error listing repositories: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def create_repository(
    payload: RepoCreateRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(verify_token)
):
    repo_id = str(uuid.uuid4())
    repo_url = str(payload.repo_url)
    
    try:
        # Extract repo name from URL
        name = repo_url.rstrip("/").split("/")[-1]
        user_id = user.get("id")

        # Precisely quote all columns to avoid case sensitivity issues in Postgres
        # Using 'pending' instead of 'processing' to match enum constraints
        await db.execute(
            text('''
                INSERT INTO repositories ("id", "userId", "name", "url", "status", "createdAt", "updatedAt")
                VALUES (:id, :user_id, :name, :url, 'pending', NOW(), NOW())
                ON CONFLICT ("id") DO NOTHING
            '''),
            {"id": repo_id, "user_id": user_id, "name": name, "url": repo_url}
        )
        await db.commit()
        
        celery_app.send_task(
            "tasks.ingest_repo",
            args=[repo_url, repo_id, user.get("id")],
            task_id=f"ingest-{repo_id}"
        )
        
        return {"id": repo_id, "repo_url": repo_url, "status": "processing"}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in create_repository: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{repo_id}/status")
async def get_repository_status(
    repo_id: str,
    db: AsyncSession = Depends(get_db)
):
    try:
        result = await db.execute(
            text("SELECT status FROM repositories WHERE id = :id"),
            {"id": repo_id}
        )
        row = result.mappings().first()
        if not row:
            raise HTTPException(status_code=404, detail="Repository not found")
            
        return {"id": repo_id, "status": row["status"]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch repository status")
