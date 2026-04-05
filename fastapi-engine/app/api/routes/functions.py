from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List
from pydantic import BaseModel
import logging

from app.core.database import get_db
from app.core.security import verify_token

logger = logging.getLogger(__name__)

router = APIRouter()

class FunctionResponse(BaseModel):
    id: str
    file_path: str
    name: str
    start_line: int
    end_line: int

@router.get("/{repo_id}", response_model=List[FunctionResponse])
async def get_repo_functions(
    repo_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(verify_token)
):
    """
    Fetch all function definitions for a specific repository.
    Returns empty list gracefully if the functions table doesn't exist yet.
    """
    try:
        logger.info(f"Fetching functions for repo ID: {repo_id}")

        # Check if the functions table exists first to avoid 500 errors
        table_check = await db.execute(
            text("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'functions')")
        )
        table_exists = table_check.scalar()

        if not table_exists:
            logger.warning("functions table does not exist yet — returning empty list")
            return []

        query = text(
            'SELECT id, file_path, name, start_line, end_line '
            'FROM functions WHERE repo_id = CAST(:repo_id AS uuid)'
        )
        result = await db.execute(query, {"repo_id": repo_id})
        rows = result.fetchall()

        return [
            FunctionResponse(
                id=str(row[0]),
                file_path=row[1],
                name=row[2],
                start_line=row[3],
                end_line=row[4]
            ) for row in rows
        ]

    except Exception as e:
        logger.error(f"Failed to fetch functions for {repo_id}: {str(e)}")
        # Return empty list instead of 500 so the graph dashboard still loads
        return []
