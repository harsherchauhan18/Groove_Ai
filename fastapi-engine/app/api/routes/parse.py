from fastapi import APIRouter, Depends, HTTPException, Body
import os
from app.core.security import verify_token
from app.core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
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
        # 0. Ensure functions table exists (Migration Stub)
        await db.execute(text('''
            CREATE TABLE IF NOT EXISTS functions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "repoId" UUID REFERENCES repositories(id),
                "filePath" TEXT,
                name TEXT,
                "startLine" INTEGER,
                "endLine" INTEGER,
                "createdAt" TIMESTAMP DEFAULT NOW()
            )
        '''))

        # 1. Update status to parsing
        await db.execute(
            text('UPDATE repositories SET status = :status, "updatedAt" = NOW() WHERE id = :repo_id'),
            {"status": "parsing", "repo_id": repo_id}
        )

        # 2. Store chunks and extract functions
        insert_params = []
        function_params = []
        
        import re
        def find_funcs(content, ext):
            funcs = []
            lines = content.split('\n')
            if ext == '.py':
                # def name(args):
                for i, line in enumerate(lines):
                    m = re.match(r'^\s*def\s+(\w+)\s*\(', line)
                    if m:
                        name = m.group(1)
                        # Heuristic: end at next def or end of file
                        funcs.append({"name": name, "start": i+1, "end": i+10}) # placeholder end
            elif ext in ['.js', '.ts', '.jsx', '.tsx']:
                # function name(args) { or const name = (args) => {
                for i, line in enumerate(lines):
                    m = re.search(r'(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:\(.*\)|[\w\d]+)\s*=>)', line)
                    if m:
                        name = (m.group(1) or m.group(2))
                        if name:
                            funcs.append({"name": name, "start": i+1, "end": i+10})
            return funcs

        for i, c in enumerate(chunks):
            insert_params.append({
                "repoId": repo_id,
                "filePath": c.file_path,
                "extension": c.extension,
                "content": c.content,
                "chunkIndex": i
            })
            
            # Extract functions
            extracted = find_funcs(c.content, c.extension)
            for f in extracted:
                function_params.append({
                    "repoId": repo_id,
                    "filePath": c.file_path,
                    "name": f["name"],
                    "start": f["start"],
                    "end": f["end"]
                })

        if insert_params:
            await db.execute(
                text('''
                    INSERT INTO code_chunks ("repoId", "filePath", extension, content, "chunkIndex")
                    VALUES (:repoId, :filePath, :extension, :content, :chunkIndex)
                '''),
                insert_params
            )

        if function_params:
            await db.execute(
                text('''
                    INSERT INTO functions ("repoId", "filePath", name, "startLine", "endLine")
            VALUES (CAST(:repo_id AS uuid), :filePath, :name, :start, :end)
        '''), function_params)

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
async def get_tree(repo_id: str, db: AsyncSession = Depends(get_db)):
    """
    Get the nested tree structure of a repository, with Git analytics metadata.
    """
    try:
        # 1. Fetch all distinct files for this repo
        result = await db.execute(
            text('SELECT DISTINCT "filePath", extension FROM code_chunks WHERE "repoId" = :repo_id'),
            {"repo_id": repo_id}
        )
        files = result.mappings().all()
        
        # 2. Extract Git meta for these files
        from app.services.git_insights import GitInsightsService
        repo = GitInsightsService.get_repo(repo_id)
        
        tree: Dict[str, Any] = {"name": repo_id, "type": "dir", "children": {}}
        
        for f in files:
            file_path = f["filePath"]
            parts = file_path.split("/")
            
            # Navigate/build tree
            current = tree["children"]
            for i, part in enumerate(parts):
                is_last = (i == len(parts) - 1)
                
                if part not in current:
                    if is_last:
                        # Fetch Git metadata for file
                        last_mod = None
                        change_count = 0
                        if repo:
                            try:
                                commits = list(repo.iter_commits(paths=file_path, max_count=50))
                                change_count = len(commits)
                                if commits:
                                    last_mod = datetime.fromtimestamp(commits[0].committed_date).strftime("%Y-%m-%d %H:%M")
                            except Exception: pass
                            
                        current[part] = {
                            "name": part,
                            "type": "file",
                            "path": file_path,
                            "last_modified": last_mod or "2024-04-05 08:30",
                            "change_count": change_count or 1,
                            "complexity": "low", # Heuristic placeholder
                            "loc": 100 # Placeholder
                        }
                    else:
                        current[part] = {"name": part, "type": "dir", "children": {}}
                
                if not is_last:
                    # Type narrowing for mypy/pyre
                    node = current[part]
                    if isinstance(node, dict) and "children" in node:
                         current = node["children"]

        # Helper to convert nested dict to list of children
        def format_children(node: Any) -> Any:
            if isinstance(node, dict) and "children" in node:
                children_list = []
                for child in node["children"].values():
                    children_list.append(format_children(child))
                node["children"] = children_list
            return node

        return format_children(tree)
        
    except Exception as e:
        logger.error(f"Error in get_tree: {e}")
        raise HTTPException(status_code=500, detail=str(e))
