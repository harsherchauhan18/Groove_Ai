from fastapi import APIRouter, Depends, HTTPException
from app.core.security import verify_token
from app.core.database import get_db
from app.core.faiss_manager import get_faiss
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import List, Optional
import httpx
import os
from app.core.config import get_settings

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
    faiss = Depends(get_faiss)
):
    """
    RAG-based chat query using Groq (Grok) API.
    """
    repo_id = payload.repo_id
    query = payload.query
    
    try:
        # 1. Similarity Search in FAISS
        # We need the query embedding
        query_emb = await faiss.get_embeddings([query])
        
        # Search Top K
        distances, indices = faiss.index.search(query_emb, k=5)
        
        # indices are strings in our FAISS manager (wait, IndexFlatL2 uses ints)
        # We stored them as ints [0...ntotal]
        found_indices = indices[0].tolist()
        
        if not found_indices or found_indices[0] == -1:
            return {"answer": "I couldn't find any relevant code in this repository.", "sources": []}

        # 2. Fetch chunk content from DB using embeddingIds
        # Our embeddingIds are just the string of the FAISS index
        found_indices_str = [str(i) for i in found_indices if i != -1]
        
        result = await db.execute(
            text('SELECT content, "filePath" FROM code_chunks WHERE "repoId" = :repo_id AND "embeddingId" = ANY(:emb_ids)'),
            {"repo_id": repo_id, "emb_ids": found_indices_str}
        )
        chunks = result.fetchall()
        
        context = "\n\n".join([f"--- File: {row[1]} ---\n{row[0]}" for row in chunks])
        
        # 3. Call Groq (labeled as GROK in env)
        # Using OpenAI-compatible endpoint for Groq
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.GROK_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": settings.GROK_MODEL,
                    "messages": [
                        {"role": "system", "content": "You are Groove AI, an expert code assistant. Use the provided context from the repository to answer the user's question accurately. Focus on code structure, logic, and explanations."},
                        {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {query}"}
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
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
