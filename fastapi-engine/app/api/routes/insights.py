from fastapi import APIRouter, Depends, HTTPException, Query
from app.services.git_insights import GitInsightsService
from app.core.database import get_db
from app.core.faiss_manager import get_faiss
from app.core.config import get_settings
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Optional, Dict, Any
from datetime import datetime
import os
import logging
import httpx

router = APIRouter()
logger = logging.getLogger(__name__)
settings = get_settings()

REPOS_BASE_DIR = os.getenv("REPOS_BASE_DIR", "../worker/data/repos")

@router.get("/tree")
async def get_insights_tree(repo_id: str = Query(...), db: AsyncSession = Depends(get_db)):
    """
    Get nested tree structure + Git metadata + complexity badges.
    """
    try:
        result = await db.execute(
            text('SELECT DISTINCT "filePath", extension FROM code_chunks WHERE "repoId" = CAST(:repo_id AS uuid)'),
            {"repo_id": repo_id}
        )
        files = result.mappings().all()
        repo = GitInsightsService.get_repo(repo_id)
        
        tree: Dict[str, Any] = {"name": repo_id, "type": "dir", "children": {}}
        import re
        
        for f in files:
            file_path = f["filePath"]
            # Handle both backslashes and forward slashes
            parts = re.split(r'[\\/]', file_path)
            current = tree["children"]
            for i, part in enumerate(parts):
                is_last = (i == len(parts) - 1)
                if part not in current:
                    if is_last:
                        last_mod, change_count = None, 0
                        if repo:
                            try:
                                # Standardize for git (always uses forward slashes)
                                git_path = file_path.replace("\\", "/")
                                commits = list(repo.iter_commits(paths=git_path, max_count=50))
                                change_count = len(commits)
                                if commits:
                                    last_mod = datetime.fromtimestamp(commits[0].committed_date).strftime("%Y-%m-%d")
                            except: pass
                        
                        current[part] = {
                            "name": part, "type": "file", "path": file_path,
                            "last_modified": last_mod or "2024-04-05",
                            "change_count": change_count or 1,
                            "complexity": "low" if change_count < 5 else ("medium" if change_count < 15 else "high"),
                            "loc": 100 # Placeholder
                        }
                    else:
                        current[part] = {"name": part, "type": "dir", "children": {}}
                if not is_last:
                    node = current[part]
                    if isinstance(node, dict) and "children" in node:
                         current = node["children"]

        def format_children(node: Any) -> Any:
            if isinstance(node, dict) and "children" in node:
                node["children"] = [format_children(c) for c in node["children"].values()]
            return node

        return format_children(tree)
    except Exception as e:
        logger.error(f"Tree error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/file")
async def get_file_insight(
    repo_id: str = Query(...), 
    file_path: str = Query(...),
    db: AsyncSession = Depends(get_db),
    faiss = Depends(get_faiss)
):
    """
    RAG-enabled file summary + metadata.
    """
    try:
        repo_path = os.path.join(REPOS_BASE_DIR, repo_id)
        # Normalize file path for current OS
        normalized_file_path = file_path.replace("/", os.path.sep).replace("\\", os.path.sep)
        full_path = os.path.join(repo_path, normalized_file_path)
        
        logger.info(f"Loading file for insights: {full_path}")
        
        if not os.path.exists(full_path):
            logger.error(f"File not found: {full_path}")
            raise HTTPException(status_code=404, detail=f"File not found on disk at {full_path}")
            
        with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        # 1. Basic Stats
        lines = content.split('\n')
        loc = len(lines)
        complexity = content.count('if ') + content.count('for ') + content.count('while ') + content.count('case ') + content.count('try ')
        
        # 2. Semantic Context (RAG)
        context_chunks = []
        try:
            query_emb = await faiss.get_embeddings([f"Identify the purpose and logic of file: {file_path}"])
            distances, indices = faiss.index.search(query_emb, k=3)
            found_indices = [str(i) for i in indices[0].tolist() if i != -1]
            
            if found_indices:
                res = await db.execute(
                    text('SELECT content FROM code_chunks WHERE "repoId" = CAST(:repo_id AS uuid) AND "embeddingId" = ANY(string_to_array(:emb_ids, \',\'))'),
                    {"repo_id": repo_id, "emb_ids": ",".join(found_indices)}
                )
                context_chunks = [r[0] for r in res.fetchall()]
        except Exception as rag_err:
            logger.warning(f"RAG failed for file insight: {rag_err}")

        # 3. AI Summary (Grok)
        preview = "\n".join(lines[:50])
        prompt = f"Analyze this file implementation: {file_path}\n\nContext Snippets:\n{''.join(context_chunks[:2])}\n\nCode Preview:\n{preview}\n\nObjective: Summarize the purpose and implementation logic.\nKeep it under 5 lines."
        
        summary = "AI analysis processing..."
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {settings.GROK_API_KEY}"},
                    json={
                        "model": settings.GROK_MODEL, 
                        "messages": [
                            {"role": "system", "content": "You are a senior codebase architect providing brief, technical summaries of file implementations."},
                            {"role": "user", "content": prompt}
                        ], 
                        "temperature": 0.1
                    },
                    timeout=10.0
                )
                if resp.status_code == 200:
                    summary = resp.json()["choices"][0]["message"]["content"]
                else:
                    logger.error(f"Groq error ({resp.status_code}): {resp.text}")
                    summary = "Failed to generate AI summary at this time."
            except Exception as grok_err: 
                logger.error(f"Grok exception: {grok_err}")
                summary = "AI summary service unavailable."

        return {
            "file_path": file_path,
            "loc": loc,
            "complexity": complexity,
            "summary": summary,
            "preview": preview,
            "last_modified": "2024-04-05" # Mock
        }
    except HTTPException: raise
    except Exception as e:
        logger.error(f"File insight error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/overview")
async def get_repo_overview(repo_id: str = Query(...), db: AsyncSession = Depends(get_db)):
    """
    Global insights: pie charts, timelines, hotspots.
    """
    try:
        # File counts
        res = await db.execute(text('SELECT COUNT(*) FROM code_chunks WHERE "repoId" = CAST(:repo_id AS uuid)'), {"repo_id": repo_id})
        total_chunks = res.scalar()
        
        # Git Stats
        authors = GitInsightsService.get_commits_per_author(repo_id)
        timeline = GitInsightsService.get_commit_timeline(repo_id)
        
        # Languages (Mock based on extensions)
        lang_res = await db.execute(
            text('SELECT extension, COUNT(*) as count FROM code_chunks WHERE "repoId" = CAST(:repo_id AS uuid) GROUP BY extension'),
            {"repo_id": repo_id}
        )
        langs = [{"name": r[0] or "unknown", "value": r[1]} for r in lang_res.fetchall()]

        return {
            "total_files": total_chunks // 4 + 1, # Heuristic
            "total_loc": total_chunks * 100,
            "authors": authors,
            "timeline": timeline,
            "languages": langs,
            "hotspots": [
                {"name": "auth.py", "complexity": 85, "churn": 22},
                {"name": "database.py", "complexity": 60, "churn": 12},
                {"name": "main.py", "complexity": 45, "churn": 30}
            ]
        }
    except Exception as e:
        logger.error(f"Overview error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

