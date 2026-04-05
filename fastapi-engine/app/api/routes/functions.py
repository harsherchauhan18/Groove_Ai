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
    Fetch all function definitions for a repo.
    Returns [] gracefully if the table doesn't exist yet.
    """
    try:
        # Guard: table may not exist yet
        check = await db.execute(
            text("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'functions')")
        )
        if not check.scalar():
            return []

        # The parse.py stores functions using camelCase columns
        result = await db.execute(
            text("""
                SELECT
                    id::text,
                    "filePath"   AS file_path,
                    name,
                    "startLine"  AS start_line,
                    "endLine"    AS end_line
                FROM functions
                WHERE "repoId" = CAST(:repo_id AS uuid)
                ORDER BY "filePath", "startLine"
            """),
            {"repo_id": repo_id}
        )
        rows = result.mappings().all()

        return [
            FunctionResponse(
                id=str(r["id"]),
                file_path=r["file_path"] or "",
                name=r["name"] or "",
                start_line=r["start_line"] or 1,
                end_line=r["end_line"] or 1,
            )
            for r in rows
        ]

    except Exception as e:
        logger.error(f"get_repo_functions error for {repo_id}: {e}")
        return []  # Never 500 — fail gracefully
