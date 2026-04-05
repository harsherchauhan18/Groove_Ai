"""
Parse Task
----------
Walks a cloned repository, reads source files, chunks them,
extracts functions/classes with accurate line ranges,
and stores everything in PostgreSQL via the FastAPI engine.
"""

import os
import re
import logging
import httpx
from app.config.celery_config import celery_app

logger = logging.getLogger(__name__)

FASTAPI_URL = os.getenv("FASTAPI_URL", "http://localhost:8000")
REPOS_BASE_DIR = os.getenv("REPOS_BASE_DIR", "./data/repos")

SUPPORTED_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx",
    ".java", ".go", ".rs", ".cpp", ".c", ".h",
    ".rb", ".php", ".cs", ".swift", ".kt",
    ".md", ".txt", ".yaml", ".yml", ".json", ".toml",
}

# ── Function / Class Extraction ───────────────────────────────────────────────

# Python: def / class / async def
_PY_DEF = re.compile(r'^(?P<indent>\s*)(?:async\s+)?(?:def|class)\s+(?P<name>\w+)\s*[\(:]')

# JS/TS: function decl, arrow, method shorthand, class
_JS_FUNC = re.compile(
    r'(?:'
    r'(?:export\s+)?(?:default\s+)?(?:async\s+)?function(?:\s*\*)?\s+(?P<fn>\w+)'           # function foo
    r'|(?:export\s+)?(?:default\s+)?class\s+(?P<cls>\w+)'                                    # class Foo
    r'|(?:const|let|var)\s+(?P<arrow>\w+)\s*=\s*(?:async\s+)?(?:\(|[\w$]+)\s*=>'            # const foo = () =>
    r'|(?P<method>(?:async\s+)?\w+)\s*\([^)]*\)\s*\{'                                       # method shorthand
    r')'
)


def _find_block_end(lines: list[str], start_idx: int, base_indent: int) -> int:
    """
    Heuristically finds the end line of a Python block by tracking indentation.
    Returns 1-indexed line number.
    """
    for i in range(start_idx + 1, len(lines)):
        stripped = lines[i]
        if not stripped.strip():
            continue  # blank line — keep going
        indent = len(stripped) - len(stripped.lstrip())
        if indent <= base_indent:
            return i  # back to same or lower indent → block ended above
    return len(lines)


def extract_functions(file_path: str, source_code: str) -> list[dict]:
    """
    Extract function and class definitions from source code.
    Returns a list of {name, type, start_line, end_line}.
    Supports Python, JavaScript, TypeScript (including JSX/TSX).
    """
    ext = os.path.splitext(file_path)[1].lower()
    lines = source_code.split("\n")
    results: list[dict] = []

    if ext == ".py":
        # Stack-based indentation tracking
        stack: list[tuple[int, int, str, str]] = []  # (indent, start_1idx, name, type)

        for i, raw in enumerate(lines):
            m = _PY_DEF.match(raw)
            if not m:
                continue

            cur_indent = len(m.group("indent"))
            name = m.group("name")
            kind = "class" if raw.lstrip().startswith("class") else "function"
            start = i + 1  # 1-indexed

            # Close any open scopes at same or deeper indent
            while stack and stack[-1][0] >= cur_indent:
                old_indent, old_start, old_name, old_kind = stack.pop()
                results.append({
                    "name": old_name,
                    "type": old_kind,
                    "start_line": old_start,
                    "end_line": max(old_start, i),  # ends just before current def
                })

            stack.append((cur_indent, start, name, kind))

        # Flush remaining stack
        for old_indent, old_start, old_name, old_kind in reversed(stack):
            results.append({
                "name": old_name,
                "type": old_kind,
                "start_line": old_start,
                "end_line": len(lines),
            })

    elif ext in {".js", ".jsx", ".ts", ".tsx"}:
        # Brace-counting approach to find end of each block
        i = 0
        while i < len(lines):
            raw = lines[i]
            m = _JS_FUNC.search(raw)
            if m:
                name = (
                    m.group("fn") or m.group("cls")
                    or m.group("arrow") or m.group("method") or "anonymous"
                )
                kind = "class" if m.group("cls") else "function"
                start = i + 1

                # Count braces to find end
                depth = raw.count("{") - raw.count("}")
                j = i + 1
                while j < len(lines) and depth > 0:
                    depth += lines[j].count("{") - lines[j].count("}")
                    j += 1

                end = j if depth == 0 else min(i + 50, len(lines))
                results.append({"name": name, "type": kind, "start_line": start, "end_line": end})
                i = j
                continue
            i += 1

    return results


# ── Repo Walker ───────────────────────────────────────────────────────────────

def _walk_repo(repo_path: str) -> list[dict]:
    """Walk repo dir and return list of {file_path, content, extension, functions}."""
    files = []
    skip_dirs = {"node_modules", "__pycache__", "venv", ".venv", "dist", "build", ".git"}

    for root, dirs, filenames in os.walk(repo_path):
        dirs[:] = [d for d in dirs if not d.startswith(".") and d not in skip_dirs]

        for fname in filenames:
            ext = os.path.splitext(fname)[1].lower()
            if ext not in SUPPORTED_EXTENSIONS:
                continue

            full = os.path.join(root, fname)
            try:
                with open(full, "r", encoding="utf-8", errors="ignore") as fh:
                    content = fh.read()
            except OSError:
                continue

            rel = os.path.relpath(full, repo_path).replace("\\", "/")
            functions = extract_functions(rel, content)

            files.append({
                "file_path": rel,
                "content": content,
                "extension": ext,
                "functions": functions,
            })

    return files


# ── Celery Task ───────────────────────────────────────────────────────────────

@celery_app.task(
    name="tasks.parse_repo",
    bind=True,
    max_retries=3,
    default_retry_delay=20,
)
def parse_repo(self, repo_id: str):
    """
    Walk cloned repo, extract code chunks + functions, store via FastAPI engine.
    """
    local_path = os.path.join(REPOS_BASE_DIR, repo_id)
    if not os.path.isdir(local_path):
        raise FileNotFoundError(f"Repo path not found: {local_path}")

    files = _walk_repo(local_path)
    logger.info("Parsed %d files for repo %s", len(files), repo_id)

    try:
        with httpx.Client(timeout=180) as client:
            resp = client.post(
                f"{FASTAPI_URL}/api/parse/store",
                json={"repo_id": repo_id, "chunks": files},
            )
            resp.raise_for_status()
    except httpx.HTTPError as exc:
        logger.error("HTTP error sending parse results: %s", exc)
        raise self.retry(exc=exc)

    return {
        "status": "success",
        "repo_id": repo_id,
        "files_parsed": len(files),
        "functions_extracted": sum(len(f["functions"]) for f in files),
    }
