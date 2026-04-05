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
    """React Flow-compatible flat graph from code_chunks file paths."""
    try:
        result = await db.execute(
            text("""
                SELECT DISTINCT "filePath", extension
                FROM code_chunks
                WHERE "repoId" = CAST(:repo_id AS uuid)
                ORDER BY "filePath"
                LIMIT 200
            """),
            {"repo_id": repo_id}
        )
        files = result.mappings().all()

        if not files:
            return {"nodes": [], "edges": []}

        nodes, edges, dir_seen = [], [], set()

        for i, f in enumerate(files):
            fp = (f["filePath"] or "").replace("\\", "/")
            parts = fp.split("/")
            fname = parts[-1]
            dname = "/".join(parts[:-1]) if len(parts) > 1 else "root"
            file_id = f"file::{fp}"
            dir_id = f"dir::{dname}"

            if dname not in dir_seen:
                dir_seen.add(dname)
                nodes.append({
                    "id": dir_id,
                    "name": parts[-2] if len(parts) > 1 else "root",
                    "type": "file", "file_path": dname, "start_line": 1,
                    "position": {"x": (len(dir_seen) % 5) * 240, "y": (len(dir_seen) // 5) * 160}
                })

            nodes.append({
                "id": file_id, "name": fname,
                "type": "function", "file_path": fp, "start_line": 1,
                "position": {"x": (i % 6) * 210 + 60, "y": (i // 6) * 130 + 90}
            })
            edges.append({"from": dir_id, "to": file_id})

        return {"nodes": nodes, "edges": edges}

    except Exception as e:
        logger.error(f"Visualization error for {repo_id}: {e}")
        return {"nodes": [], "edges": []}
