from fastapi import APIRouter, Depends, HTTPException, Body
import os
from app.core.security import verify_token
from app.core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import List, Optional
from app.config.celery_config import celery_app

import logging
import traceback
logger = logging.getLogger(__name__)

router = APIRouter()

class CodeChunk(BaseModel):
    file_path: str
    content: str
    extension: str

class ParseStoreRequest(BaseModel):
    repo_id: str
    chunks: List[CodeChunk]

@router.post("/store")
async def store_parsed_repo(
    payload: ParseStoreRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Store parsed repository chunks in the database (Batch-friendly).
    """
    repo_id = payload.repo_id
    chunks = payload.chunks

    try:
        # Avoid redundant status updates during batching
        # Chunks are stored in code_chunks table
        insert_params = [
            {
                "repoId": repo_id,
                "filePath": c.file_path,
                "extension": c.extension,
                "content": c.content,
                "chunkIndex": i
            }
            for i, c in enumerate(chunks)
        ]

        if insert_params:
            await db.execute(
                text('''
                    INSERT INTO code_chunks ("repoId", "filePath", extension, content, "chunkIndex")
                    VALUES (:repoId, :filePath, :extension, :content, :chunkIndex)
                    ON CONFLICT DO NOTHING
                '''),
                insert_params
            )
            await db.commit()
            
        return {"status": "success", "chunk_count": len(chunks)}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in store_parsed_repo: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/complete")
async def complete_parsing(
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Trigger post-parsing steps: Neo4j population and Embedding.
    """
    repo_id = payload.get("repo_id")
    try:
        # Update status to analyzing
        await db.execute(
            text('UPDATE repositories SET status = :status, "updatedAt" = NOW() WHERE id = :repo_id'),
            {"status": "analyzing", "repo_id": repo_id}
        )
        await db.commit()

        # Build Neo4j Graph asynchronously (off-thread ideally, but using await sequential for now but isolated)
        from app.services.graph_service import get_graph_service
        graph = get_graph_service()
        
        # Fetch all files to build the graph
        result = await db.execute(
            text('SELECT "filePath", content FROM code_chunks WHERE "repoId" = :repo_id'),
            {"repo_id": repo_id}
        )
        all_chunks = result.fetchall()
        
        # Group chunks by file to extract dependencies
        file_map = {}
        for row in all_chunks:
            f, c = row[0], row[1]
            if f not in file_map: file_map[f] = ""
            file_map[f] += c

        await graph.add_repository(repo_id, repo_id)
        for path, content in file_map.items():
            await graph.add_file(repo_id, path)
            ext = os.path.splitext(path)[1]
            # Naive parse
            deps = graph.extract_imports(content, ext)
            for d in deps:
                # Add connections for dependencies that look like files in the repo
                # This could be deep-walked, but for now simple link
                pass

        # Trigger Embedding Pipeline
        celery_app.send_task("tasks.embed_repo", args=[repo_id])
        
        return {"status": "success", "message": "Pipeline completed processing."}
    except Exception as e:
        logger.error(f"Error in complete_parsing: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tree/{repo_id}")
async def get_tree(
    repo_id: str, 
    db: AsyncSession = Depends(get_db)
):
    """
    Get all unique file paths for a repo to build the file explorer tree.
    """
    try:
        result = await db.execute(
            text('SELECT DISTINCT "filePath" FROM code_chunks WHERE "repoId" = :repo_id'),
            {"repo_id": repo_id}
        )
        paths = [row[0] for row in result.all()]
        return {"repo_id": repo_id, "files": paths}
    except Exception as e:
        logger.error(f"Error fetching tree: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/file")
async def get_file_content(
    repo_id: str,
    file_path: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get the full content of a file by concatenating its chunks.
    """
    try:
        result = await db.execute(
            text('SELECT content FROM code_chunks WHERE "repoId" = :repo_id AND "filePath" = :file_path ORDER BY "chunkIndex" ASC'),
            {"repo_id": repo_id, "file_path": file_path}
        )
        chunks = [row[0] for row in result.all()]
        if not chunks:
            raise HTTPException(status_code=404, detail="File not found")
        
        return {"repo_id": repo_id, "file_path": file_path, "content": "".join(chunks)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching file content: {e}")
        raise HTTPException(status_code=500, detail=str(e))
