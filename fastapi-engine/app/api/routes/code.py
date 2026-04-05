from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
import logging

from app.core.database import get_db
from app.core.security import verify_token

logger = logging.getLogger(__name__)

router = APIRouter()

class CodeResponse(BaseModel):
    file_path: str
    content: str

@router.get("/{repo_id}", response_model=CodeResponse)
async def get_file_content(
    repo_id: str,
    filePath: str = Query(..., description="The relative path of the file to retrieve within the repository"),
    db: AsyncSession = Depends(get_db),
    user=Depends(verify_token)
):
    """
    Reconstructs the full content of a file by joining all its chunks from the database
    ordered by their chunk index. Useful for Monaco editor previews.
    """
    try:
        logger.info(f"Reconstructing code for: {filePath} in repo: {repo_id}")
        
        # Casting repo_id to uuid is necessary for PostgreSQL uuid columns comparison
        query = text('''
            SELECT content 
            FROM code_chunks 
            WHERE "repoId" = CAST(:repo_id AS uuid) 
            AND "filePath" = :file_path 
            ORDER BY "chunkIndex" ASC
        ''')
        
        result = await db.execute(query, {"repo_id": repo_id, "file_path": filePath})
        chunks = result.fetchall()
        
        if not chunks:
            logger.warn(f"File content not found: {filePath}")
            raise HTTPException(status_code=404, detail="The requested file and its chunks were not found in the database.")
        
        # Concatenate chunks into single string
        full_content = "".join([row[0] for row in chunks])
        
        return CodeResponse(
            file_path=filePath,
            content=full_content
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving full code: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal database error: {str(e)}")

# Registration Hint (Add to app/main.py):
# from app.api.routes import code
# app.include_router(code.router, prefix="/api/code", tags=["code"])
