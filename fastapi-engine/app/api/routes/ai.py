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
        emb_ids_joined = ",".join(found_indices_str)
        
        result = await db.execute(
            text('SELECT content, "filePath" FROM code_chunks WHERE "repoId" = CAST(:repo_id AS uuid) AND "embeddingId" = ANY(string_to_array(:emb_ids_str, \',\'))'),
            {"repo_id": repo_id, "emb_ids_str": emb_ids_joined}
        )
        chunks = result.fetchall()
        
        context = "\n\n".join([f"--- File: {row[1]} ---\n{row[0]}" for row in chunks])
        
        # 3. Retrieve Project Overview (All Files)
        files_res = await db.execute(
            text('SELECT DISTINCT "filePath" FROM code_chunks WHERE "repoId" = CAST(:repo_id AS uuid) LIMIT 50'),
            {"repo_id": repo_id}
        )
        repo_files = [r[0] for r in files_res.fetchall()]
        repo_structure = "\n".join(repo_files)

        # 4. Construct Prompt
        system_prompt = f"""You are Groove AI, the lead technical architect for this repository.
Your task is to provide accurate, codebase-specific insights.

STRICT OPERATING PROCEDURES:
1. FOCUS: Only provide answers based on the code snippets and repository structure provided.
2. LIMITS: If the requested information isn't in the provided context, state clearly that you cannot find it in the current codebase.
3. NO GENERALIZATIONS: Do not give general programming tutorials. Explain how logic is implemented *here*.
4. CITATIONS: Always mention the relevant file paths when explaining logic.

REPOSITORY STRUCTURE (Partial):
{repo_structure}

CONTEXT SNIPPETS:
{context}"""

        messages = [
             {"role": "system", "content": system_prompt}
        ]
        
        if payload.history is not None:
            for msg in payload.history:
                messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
                
        messages.append({"role": "user", "content": f"User Query: {query}"})

        # 4. Call Groq API
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.GROK_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                        "model": settings.GROK_MODEL,
                        "messages": messages,
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

class NavigateRequest(BaseModel):
    repo_id: str
    query: str

class FileRequest(BaseModel):
    repo_id: str
    file_path: str

@router.post("/file")
async def get_file_content(payload: FileRequest, db: AsyncSession = Depends(get_db), user=Depends(verify_token)):
    repo_id = payload.repo_id
    file_path = payload.file_path
    try:
        all_chunks_res = await db.execute(
            text('SELECT content FROM code_chunks WHERE "repoId" = CAST(:repo_id AS uuid) AND "filePath" = :fp ORDER BY "chunkIndex" ASC'),
            {"repo_id": repo_id, "fp": file_path}
        )
        all_chunks = [r[0] for r in all_chunks_res.fetchall()]
        full_code = "\n".join(all_chunks) if all_chunks else ""
        return {"content": full_code, "file_path": file_path}
    except Exception as e:
        logger.error(f"Error fetching file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/navigate")
async def navigate_code(
    payload: NavigateRequest,
    db: AsyncSession = Depends(get_db),
    faiss = Depends(get_faiss),
    user=Depends(verify_token)
):
    repo_id = payload.repo_id
    query = payload.query
    
    try:
        # 1. Embed query
        query_emb = await faiss.get_embeddings([query])
        
        # 2. FAISS Search
        distances, indices = faiss.index.search(query_emb, k=15)
        found_indices = indices[0].tolist()
        if not found_indices or found_indices[0] == -1:
            raise HTTPException(status_code=404, detail="No relevant code found for this query.")
            
        # 3. Fetch from DB
        found_indices_str = [str(i) for i in found_indices if i != -1]
        emb_ids_joined = ",".join(found_indices_str)
        
        result = await db.execute(
            text('SELECT content, "filePath", "embeddingId" FROM code_chunks WHERE "repoId" = CAST(:repo_id AS uuid) AND "embeddingId" = ANY(string_to_array(:emb_ids_str, \',\'))'),
            {"repo_id": repo_id, "emb_ids_str": emb_ids_joined}
        )
        chunks = result.fetchall()
        
        if not chunks:
             raise HTTPException(status_code=404, detail="Coordinates found but chunks missing.")

        # 4. Aggregation by File Path
        # Choose the best rank for each file
        file_scores = {}
        file_snippets = {}
        for idx_str in found_indices_str:
            chunk = next((c for c in chunks if str(c[2]) == idx_str), None)
            if chunk:
                fp, content = chunk[1], chunk[0]
                rank = found_indices_str.index(idx_str)
                score = 1.0 / (rank + 1)
                
                if fp not in file_scores:
                    file_scores[fp] = 0
                    file_snippets[fp] = content
                file_scores[fp] += score
                
        sorted_files = sorted(file_scores.items(), key=lambda x: x[1], reverse=True)[:5]
        
        # 5. LLM Re-ranking (Groq)
        best_file = sorted_files[0][0]
        confidence = 0.7
        
        # Increase snippet context for better re-ranking
        candidates_ctx = "\n".join([f"Option {i}: {fp}\nSample Content: {file_snippets[fp][:800]}..." for i, (fp, _) in enumerate(sorted_files)])
        prompt = f"""Task: Identify the MOST RELEVANT file in the codebase for this user search.

USER QUERY: "{query}"

CANDIDATE FILES:
{candidates_ctx}

DECISION CRITERIA:
1. If the user is asking for a specific feature (e.g., 'login', 'auth'), prioritize files that IMPLEMENT that feature (e.g., controllers, services, pages) over infrastructure files (e.g., middleware, config).
2. Look for explicit matches in filename and implementation logic.
3. If multiple files match, pick the one that contains the core logic or the primary entry point.

INSTRUCTION: Return ONLY the index number (0, 1, 2, 3, or 4). Do not explain your choice."""
        
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {settings.GROK_API_KEY}"},
                    json={
                        "model": settings.GROK_MODEL,
                        "messages": [{"role": "system", "content": "You are a code navigation expert. You help developers find the right file in a repository based on their intent."}, {"role": "user", "content": prompt}],
                        "temperature": 0.0
                    },
                    timeout=8.0
                )
                if resp.status_code == 200:
                    ai_res = resp.json()["choices"][0]["message"]["content"].strip()
                    import re
                    m = re.search(r'\d+', ai_res)
                    if m:
                        idx = int(m.group())
                        if 0 <= idx < len(sorted_files):
                            best_file = sorted_files[idx][0]
                            confidence = 0.95
        except Exception: 
            pass # Fallback to top similarity result

        # 6. Retrieve function context from 'functions' table
        func_res = await db.execute(
            text('SELECT name, "startLine", "endLine" FROM functions WHERE "repoId" = CAST(:repo_id AS uuid) AND "filePath" = :fp'),
            {"repo_id": repo_id, "fp": best_file}
        )
        all_funcs = func_res.fetchall()
        
        start_line = 1
        end_line = 10
        function_name = None
        
        # Try to find a function that contains our best chunk (simplified)
        snippet_matched = file_snippets.get(best_file, "")
        if all_funcs:
            # Find function with best textual or line overlap
            for f in all_funcs:
                # If we had snippet line numbers, we'd check if snippet is inside f.
                # For now, if snippet matches function name or just pick first relevant
                if f[0] and f[0] in snippet_matched:
                    start_line = f[1]
                    end_line = f[2]
                    function_name = f[0]
                    break
            else:
                # Fallback to first function if nothing else matches
                start_line = all_funcs[0][1]
                end_line = all_funcs[0][2]
                function_name = all_funcs[0][0]
        else:
            # Fallback to heuristic from file content
            all_chunks_res = await db.execute(
                text('SELECT content FROM code_chunks WHERE "repoId" = CAST(:repo_id AS uuid) AND "filePath" = :fp ORDER BY "chunkIndex" ASC'),
                {"repo_id": repo_id, "fp": best_file}
            )
            all_chunks_content = [r[0] for r in all_chunks_res.fetchall()]
            full_file_str = "\n".join(all_chunks_content)
            
            if snippet_matched and full_file_str:
                pos = full_file_str.find(snippet_matched)
                if pos != -1:
                    prefix = full_file_str[:pos]
                    start_line = prefix.count('\n') + 1
                    end_line = start_line + snippet_matched.count('\n')

        # 7. Alternatives
        alternatives = []
        for fp, s in sorted_files:
            if fp != best_file:
                alternatives.append({"file_path": fp, "start_line": 1, "score": s})
                
        return {
            "file_path": best_file,
            "start_line": start_line,
            "end_line": end_line,
            "function_name": function_name,
            "confidence": confidence,
            "alternatives": alternatives[:3]
        }
        
    except Exception as e:
        logger.error(f"Navigation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

