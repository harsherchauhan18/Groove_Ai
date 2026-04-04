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
    Store parsed repository chunks in the database and trigger embedding.
    """
    repo_id = payload.repo_id
    chunks = payload.chunks

    try:
        # 1. Update status to parsing
        await db.execute(
            text('UPDATE repositories SET status = :status, "updatedAt" = NOW() WHERE id = :repo_id'),
            {"status": "parsing", "repo_id": repo_id}
        )

        # 2. Store chunks in code_chunks table
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
                '''),
                insert_params
            )
        stored_count = len(chunks)

        # 3. Populate Neo4j Graph
        from app.services.graph_service import get_graph_service
        graph = get_graph_service()

        # Add repository
        repo_name = repo_id # Or get from DB
        await graph.add_repository(repo_id, repo_name)
        
        file_map = {}
        for c in chunks:
            if c.file_path not in file_map:
                file_map[c.file_path] = ""
            file_map[c.file_path] += c.content

        for file_path, content in file_map.items():
            await graph.add_file(repo_id, file_path)
            # Naive dependency extraction
            ext = os.path.splitext(file_path)[1]
            deps = graph.extract_imports(content, ext)
            for d in deps:
                # Best effort mapping of imports to files
                # e.g. import "core/database" -> "core/database.py"
                # This is a bit complex for a stub, skip for now but keep the logic structure
                pass

        # 4. Update status to analyzing (after parsing is done)
        await db.execute(
            text('UPDATE repositories SET status = :status, "updatedAt" = NOW() WHERE id = :repo_id'),
            {"status": "analyzing", "repo_id": repo_id}
        )
        await db.commit()

        # 5. Trigger Embedding Task
        celery_app.send_task("tasks.embed_repo", args=[repo_id])

        return {"status": "success", "files_stored": stored_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in store_parsed_repo: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tree/{repo_id}")
async def get_tree(repo_id: str, user=Depends(verify_token)):
    return {"message": "parse stub", "repo_id": repo_id}
