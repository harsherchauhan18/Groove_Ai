from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.security import verify_token
from app.core.database import get_db
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/dependency/{repo_id}")
async def get_dependency_graph(repo_id: str, user=Depends(verify_token)):
    return {"message": "graph stub", "repo_id": repo_id}


@router.get("/visualization/{repo_id}")
async def get_visualization_graph(
    repo_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(verify_token)
):
    """
    Returns a React Flow-compatible graph of files and their relationships
    built from the code_chunks table. Falls back to an empty graph gracefully.
    """
    try:
        # Fetch distinct files for this repo
        result = await db.execute(
            text(
                'SELECT DISTINCT "filePath", extension '
                'FROM code_chunks WHERE "repoId" = CAST(:repo_id AS uuid) '
                'ORDER BY "filePath" LIMIT 200'
            ),
            {"repo_id": repo_id}
        )
        files = result.mappings().all()

        if not files:
            return {"nodes": [], "edges": []}

        # Build nodes — one per file
        nodes = []
        edges = []
        dir_nodes_seen = set()
        
        for i, f in enumerate(files):
            file_path = f["filePath"] or ""
            ext = f["extension"] or "unknown"
            parts = file_path.replace("\\", "/").split("/")
            file_name = parts[-1]
            dir_name = "/".join(parts[:-1]) if len(parts) > 1 else "root"

            file_id = f"file::{file_path}"
            dir_id = f"dir::{dir_name}"

            # Add directory node once
            if dir_name not in dir_nodes_seen:
                dir_nodes_seen.add(dir_name)
                nodes.append({
                    "id": dir_id,
                    "name": parts[-2] if len(parts) > 1 else "root",
                    "type": "file",
                    "file_path": dir_name,
                    "start_line": 1,
                    "position": {
                        "x": (len(dir_nodes_seen) % 5) * 220,
                        "y": (len(dir_nodes_seen) // 5) * 150
                    }
                })

            # Add file node
            nodes.append({
                "id": file_id,
                "name": file_name,
                "type": "function",
                "file_path": file_path,
                "start_line": 1,
                "extension": ext,
                "position": {
                    "x": (i % 6) * 200 + 50,
                    "y": (i // 6) * 120 + 80
                }
            })

            # Edge from directory to file
            edges.append({
                "from": dir_id,
                "to": file_id
            })

        return {"nodes": nodes, "edges": edges}

    except Exception as e:
        logger.error(f"Graph visualization error for {repo_id}: {str(e)}")
        # Return empty graph instead of 500 so the dashboard still renders
        return {"nodes": [], "edges": []}
