from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.security import verify_token
from app.core.database import get_db
from typing import Any, Dict, List
import re
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# ── Helpers ────────────────────────────────────────────────────────────────────

EXT_COLORS = {
    "ts": "#3b82f6", "tsx": "#3b82f6", "js": "#f59e0b", "jsx": "#f59e0b",
    "py": "#10b981", "css": "#ec4899", "scss": "#ec4899", "md": "#94a3b8",
    "json": "#f97316", "html": "#ef4444", "go": "#06b6d4", "rs": "#f59e0b",
    "java": "#f87171", "yaml": "#a78bfa", "yml": "#a78bfa", "toml": "#f97316",
    "sh": "#94a3b8", "txt": "#64748b",
}


def get_ext_color(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return EXT_COLORS.get(ext, "#64748b")


def build_tree(file_rows: List[Dict]) -> Dict[str, Any]:
    """
    Builds a nested dict tree from a flat list of file path dicts.
    Each dict must have: path, loc, complexity, change_count
    """
    root: Dict[str, Any] = {
        "name": "root",
        "type": "dir",
        "path": "",
        "children": {}
    }

    for row in file_rows:
        raw_path = row.get("path", "")
        parts = [p for p in re.split(r"[/\\]", raw_path) if p]
        if not parts:
            continue

        current = root["children"]
        for i, part in enumerate(parts):
            is_last = (i == len(parts) - 1)
            built_path = "/".join(parts[:i + 1])

            if is_last:
                current[part] = {
                    "name": part,
                    "type": "file",
                    "path": raw_path,
                    "ext": part.rsplit(".", 1)[-1].lower() if "." in part else "",
                    "color": get_ext_color(part),
                    "loc": row.get("loc", 0),
                    "complexity": row.get("complexity", "low"),
                    "change_count": row.get("change_count", 0),
                }
            else:
                if part not in current:
                    current[part] = {
                        "name": part,
                        "type": "dir",
                        "path": built_path,
                        "children": {}
                    }
                node = current[part]
                if node.get("type") != "dir":
                    break
                current = node["children"]

    def dict_to_sorted_list(node: Dict) -> Dict:
        if node.get("type") == "dir" and "children" in node:
            children = [dict_to_sorted_list(c) for c in node["children"].values()]
            # Dirs first, then files, both alphabetically
            children.sort(key=lambda x: (0 if x["type"] == "dir" else 1, x["name"].lower()))
            node["children"] = children
        return node

    return dict_to_sorted_list(root)


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/dependency/{repo_id}")
async def get_dependency_graph(repo_id: str, user=Depends(verify_token)):
    return {"message": "graph stub", "repo_id": repo_id}


@router.get("/tree/{repo_id}")
async def get_repo_tree(
    repo_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(verify_token)
):
    """
    Builds a VS Code-style nested tree from code_chunks file paths.
    Includes LOC estimate, complexity badge, and chunk metadata.
    """
    try:
        result = await db.execute(
            text("""
                SELECT
                    "filePath"           AS path,
                    extension,
                    COUNT(*)             AS chunk_count,
                    SUM(LENGTH(content)) AS total_chars
                FROM code_chunks
                WHERE "repoId" = CAST(:repo_id AS uuid)
                GROUP BY "filePath", extension
                ORDER BY "filePath"
            """),
            {"repo_id": repo_id}
        )
        rows = result.mappings().all()

        if not rows:
            return {
                "name": "root", "type": "dir", "path": "",
                "children": [], "empty": True
            }

        file_rows = []
        for r in rows:
            loc = (r["total_chars"] or 0) // 50
            chunks = r["chunk_count"] or 0
            complexity = "high" if chunks > 10 else ("medium" if chunks > 4 else "low")
            file_rows.append({
                "path": r["path"] or "",
                "loc": loc,
                "complexity": complexity,
                "change_count": chunks,
            })

        return build_tree(file_rows)

    except Exception as e:
        logger.error(f"Tree build error for {repo_id}: {e}")
        return {"name": "root", "type": "dir", "path": "", "children": [], "error": str(e)}


@router.get("/visualization/{repo_id}")
async def get_visualization_graph(
    repo_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(verify_token)
):
    """React Flow-compatible flat graph from code_chunks and functions."""
    try:
        # 1. Fetch files
        file_res = await db.execute(
            text("""
                SELECT DISTINCT "filePath"
                FROM code_chunks
                WHERE "repoId" = CAST(:repo_id AS uuid)
            """),
            {"repo_id": repo_id}
        )
        files = file_res.mappings().all()

        # 2. Fetch functions (safeguard in case table doesn't exist yet)
        functions = []
        check = await db.execute(
            text("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'functions')")
        )
        if check.scalar():
            fn_res = await db.execute(
                text("""
                    SELECT id, name, "filePath", "startLine", "endLine"
                    FROM functions
                    WHERE "repoId" = CAST(:repo_id AS uuid)
                """),
                {"repo_id": repo_id}
            )
            functions = fn_res.mappings().all()

        if not files:
            return {"nodes": [], "edges": []}

        nodes, edges = [], []
        
        # Add root node
        nodes.append({
            "id": "root", "name": "Repository Root", "type": "file",
            "file_path": "", "start_line": 0, "end_line": 0
        })

        file_ids = set()
        for f in files:
            fp = (f["filePath"] or "").replace("\\", "/")
            fid = f"file::{fp}"
            if fid not in file_ids:
                file_ids.add(fid)
                nodes.append({
                    "id": fid, "name": fp.split("/")[-1], 
                    "type": "file", "file_path": fp, 
                    "start_line": 1, "end_line": 1
                })
                # Link root -> file
                edges.append({"from": "root", "to": fid})

        for fn in functions:
            fp = (fn["filePath"] or "").replace("\\", "/")
            fid = f"file::{fp}"
            fn_id = str(fn["id"])
            nodes.append({
                "id": fn_id, "name": fn["name"],
                "type": "function", "file_path": fp,
                "start_line": fn["startLine"], "end_line": fn["endLine"]
            })
            # Link file -> function
            edges.append({"from": fid, "to": fn_id})

        return {"nodes": nodes, "edges": edges}

    except Exception as e:
        logger.error(f"Visualization error for {repo_id}: {e}")
        return {"nodes": [], "edges": []}
