from fastapi import APIRouter, Depends, HTTPException
from app.core.security import verify_token
from app.core.database import get_db
from app.core.faiss_manager import get_faiss
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import List, Optional
import httpx
import logging
import traceback
from app.core.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter()
settings = get_settings()

class ChatRequest(BaseModel):
    repo_id: str
    query: str
    history: Optional[List[dict]] = []

@router.post("/query")
async def query_repo(
    payload: ChatRequest,
    db: AsyncSession = Depends(get_db),
    faiss = Depends(get_faiss),
    user = Depends(verify_token)
):
    """
    RAG-based chat query using Groq (Grok) API.
    """
    repo_id = payload.repo_id
    query = payload.query
    
    try:
        # 1. Similarity Search in FAISS
        query_emb = await faiss.get_embeddings([query])
        distances, indices = faiss.index.search(query_emb, k=5)
        
        found_indices = indices[0].tolist()
        if not found_indices or found_indices[0] == -1:
            return {"answer": "I couldn't find any relevant code in this repository.", "sources": []}

        # 2. Fetch chunk content from DB
        found_indices_str = [str(i) for i in found_indices if i != -1]
        
        result = await db.execute(
            text('SELECT content, "filePath" FROM code_chunks WHERE "repoId" = CAST(:repo_id AS uuid) AND "embeddingId" = ANY(:emb_ids)'),
            {"repo_id": repo_id, "emb_ids": found_indices_str}
        )
        chunks = result.fetchall()
        
        context = "\n\n".join([f"--- File: {row[1]} ---\n{row[0]}" for row in chunks])
        
        # 3. Call Groq API
        grok_key = settings.GROK_API_KEY.strip() if settings.GROK_API_KEY else ""
        if not grok_key:
            return {"answer": "Groq API key is missing. Please configure GROK_API_KEY in your fast-api engine .env file.", "sources": []}

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {grok_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": settings.GROK_MODEL,
                    "messages": [
                        {"role": "system", "content": "You are Groove AI, an expert code assistant. Use the provided context from the repository to answer the user's question accurately. Focus on code structure, logic, and explanations. Keep answers concise but insightful."},
                        {"role": "user", "content": f"Context snippets:\n{context}\n\nQuestion: {query}"}
                    ],
                    "temperature": 0.2
                },
                timeout=60.0
            )
            resp.raise_for_status()
            ai_data = resp.json()
            answer = ai_data['choices'][0]['message']['content']

        return {
            "answer": answer,
            "sources": list(set([row[1] for row in chunks]))
        }
        
    except Exception as e:
        logger.error(f"Error in query_repo: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/explain")
async def explain_code(payload: dict, user=Depends(verify_token)):
    # Legacy stub
    return {"message": "Use /query for full RAG chat"}
