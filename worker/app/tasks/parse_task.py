"""
Parse Task
----------
Walks a cloned repository, reads source files, chunks them, and
stores the raw code chunks in PostgreSQL via the FastAPI engine.
"""

import os
import logging
import httpx
from app.config.celery_config import celery_app

logger = logging.getLogger(__name__)

FASTAPI_URL = os.getenv("FASTAPI_URL", "http://localhost:8000")
REPOS_BASE_DIR = os.getenv("REPOS_BASE_DIR", "./data/repos")

# File extensions to index
SUPPORTED_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx",
    ".java", ".go", ".rs", ".cpp", ".c", ".h",
    ".rb", ".php", ".cs", ".swift", ".kt",
    ".md", ".txt", ".yaml", ".yml", ".json", ".toml",
}


def _walk_repo(repo_path: str) -> list[dict]:
    """Return a list of {path, content} dicts for all supported source files."""
    chunks = []
    for root, dirs, files in os.walk(repo_path):
        # Skip hidden / dependency directories
        dirs[:] = [
            d for d in dirs
            if not d.startswith(".") and d not in {"node_modules", "__pycache__", "venv", ".venv"}
        ]
        for fname in files:
            ext = os.path.splitext(fname)[1].lower()
            if ext not in SUPPORTED_EXTENSIONS:
                continue
            fpath = os.path.join(root, fname)
            try:
                with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                chunks.append({
                    "file_path": os.path.relpath(fpath, repo_path),
                    "content": content,
                    "extension": ext,
                })
            except OSError:
                pass
    return chunks


@celery_app.task(
    name="tasks.parse_repo",
    bind=True,
    max_retries=3,
    default_retry_delay=20,
)
def parse_repo(self, repo_id: str):
    """
    Walk a cloned repository, extract code chunks and functions, 
    and store them in PostgreSQL and Neo4j.
    """
    local_path = os.path.join(REPOS_BASE_DIR, repo_id)
    if not os.path.isdir(local_path):
        raise FileNotFoundError(f"Repo path not found: {local_path}")

    files = _walk_repo(local_path)
    logger.info("Parsed %d files for repo %s", len(files), repo_id)

    # Function Extraction Dispatcher
    def extract_functions(content, ext):
        funcs = []
        lines = content.split('\n')
        # Simple extraction logic for the worker flow
        if ext == '.py':
            import re
            for i, line in enumerate(lines):
                m = re.match(r'^\s*def\s+(\w+)\s*\(', line)
                if m:
                    funcs.append({"name": m.group(1), "start": i+1, "end": i+1}) # end line logic placeholder
        elif ext in ['.js', '.ts', '.jsx', '.tsx']:
            import re
            for i, line in enumerate(lines):
                m = re.search(r'(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:\(.*\)|[\w\d]+)\s*=>)', line)
                if m:
                    name = m.group(1) or m.group(2)
                    if name:
                        funcs.append({"name": name, "start": i+1, "end": i+1})
        return funcs

    # Enrich processed files with function metadata
    for f in files:
        f['functions'] = extract_functions(f['content'], f['extension'])

    try:
        with httpx.Client(timeout=120) as client:
            # Send everything to FastAPI for storage and Neo4j sync
            resp = client.post(
                f"{FASTAPI_URL}/api/parse/store",
                json={"repo_id": repo_id, "chunks": files},
            )
            resp.raise_for_status()
    except httpx.HTTPError as exc:
        logger.error("HTTP error sending parse results: %s", exc)
        raise self.retry(exc=exc)

    return {"status": "success", "repo_id": repo_id, "files_parsed": len(files)}
