/**
 * groove-ai — Shared Constants
 * Used by both the Node API and (via API docs) the client.
 */

// Repository pipeline statuses
export const REPO_STATUS = {
  PENDING: "pending",
  INGESTING: "ingesting",
  PARSED: "parsed",
  EMBEDDED: "embedded",
  READY: "ready",
  ERROR: "error",
} as const;

// Celery / BullMQ task names
export const TASK_NAMES = {
  INGEST_REPO: "tasks.ingest_repo",
  PARSE_REPO: "tasks.parse_repo",
  EMBED_REPO: "tasks.embed_repo",
} as const;

// Analysis types stored in the DB
export const ANALYSIS_TYPES = {
  SUMMARY: "summary",
  GRAPH: "graph",
  DEPENDENCIES: "dependencies",
  QA: "qa",
} as const;

// Chat roles
export const CHAT_ROLES = {
  USER: "user",
  ASSISTANT: "assistant",
} as const;

// Supported source file extensions (mirrors worker parse_task.py)
export const SUPPORTED_EXTENSIONS = [
  ".py", ".js", ".ts", ".jsx", ".tsx",
  ".java", ".go", ".rs", ".cpp", ".c", ".h",
  ".rb", ".php", ".cs", ".swift", ".kt",
  ".md", ".txt", ".yaml", ".yml", ".json", ".toml",
] as const;

// API route prefixes
export const API_ROUTES = {
  AUTH: "/api/auth",
  REPOS: "/api/repos",
  CHAT: "/api/chat",
  METRICS: "/api/metrics",
} as const;
