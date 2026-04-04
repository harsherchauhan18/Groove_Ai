from fastapi import APIRouter, Depends, HTTPException
from app.core.security import verify_token
from app.core.database import get_db
from app.core.faiss_manager import get_faiss
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
import asyncio
import logging
import traceback

logger = logging.getLogger(__name__)
router = APIRouter()

class EmbedRequest(BaseModel):
    repo_id: str

@router.post("/generate")
async def embed_repo(
    payload: EmbedRequest,
    db: AsyncSession = Depends(get_db),
    faiss = Depends(get_faiss)
):
    """
    Generate vector embeddings for all code chunks in a repository.
    Fixed: Uses bulk updates to prevent timeouts and local embeddings (Grok-like).
    """
    repo_id = payload.repo_id
    try:
        # 1. Update status to analyzing
        await db.execute(
            text('UPDATE repositories SET status = :status, "updatedAt" = NOW() WHERE id = :repo_id'),
            {"status": "analyzing", "repo_id": repo_id}
        )
        await db.commit()

        # 2. Get chunks from DB
        result = await db.execute(
            text('SELECT id, content, "filePath" FROM code_chunks WHERE "repoId" = :repo_id ORDER BY id'),
            {"repo_id": repo_id}
        )
        chunks = result.fetchall()
        
        if not chunks:
            await db.execute(
                text('UPDATE repositories SET status = :status, "lastAnalyzedAt" = NOW(), "updatedAt" = NOW() WHERE id = :repo_id'),
                {"status": "completed", "repo_id": repo_id}
            )
            await db.commit()
            return {"status": "success", "message": "no chunks found", "repo_id": repo_id}

        # Extracted values from SQL result rows
        texts = [row[1] for row in chunks]
        chunk_ids = [row[0] for row in chunks]
        file_paths = [row[2] for row in chunks]
        
        # 3. Generate embeddings and add to FAISS
        # This now uses local BGE model (384 dimension)
        embedding_ids = await faiss.add_texts(
            texts=texts,
            repo_id=repo_id,
            file_paths=file_paths
        )
        
        # 4. BULK Update code_chunks with embeddingId
        # Using a list of dicts with SQLAlchemy text() performs a bulk operation
        update_params = [
            {"emb_id": embedding_ids[i], "chunk_id": chunk_id} 
            for i, chunk_id in enumerate(chunk_ids)
        ]
        
        if update_params:
            logger.info(f"Performing bulk update for {len(update_params)} chunks in repo {repo_id}")
            await db.execute(
                text('UPDATE code_chunks SET "embeddingId" = :emb_id WHERE id = :chunk_id'),
                update_params
            )
            
        # 5. Update status to completed
        await db.execute(
            text('UPDATE repositories SET status = :status, "lastAnalyzedAt" = NOW(), "updatedAt" = NOW() WHERE id = :repo_id'),
            {"status": "completed", "repo_id": repo_id}
        )
        await db.commit()
        
        return {"status": "success", "repo_id": repo_id, "chunks_embedded": len(embedding_ids)}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in embed_repo: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))
