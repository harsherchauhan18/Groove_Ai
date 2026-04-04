/**
 * groove-ai — Shared TypeScript Types
 * Common data shapes used across node-api and client.
 */

// ── Auth ─────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  provider: "local" | "google";
  isActive: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

// ── Repository ────────────────────────────────────────────────
export type RepoStatus =
  | "pending"
  | "ingesting"
  | "parsed"
  | "embedded"
  | "ready"
  | "error";

export interface Repository {
  id: string;
  ownerId: string;
  repoUrl: string;
  name: string;
  description: string | null;
  status: RepoStatus;
  errorMsg: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Code Chunk ────────────────────────────────────────────────
export interface CodeChunk {
  id: string;
  repoId: string;
  filePath: string;
  extension: string;
  content: string;
  chunkIndex: number;
  embeddingId: string | null;
  createdAt: string;
}

// ── Analysis ─────────────────────────────────────────────────
export interface AnalysisResult {
  id: string;
  repoId: string;
  analysisType: string;
  result: Record<string, unknown>;
  createdAt: string;
}

// ── Chat ─────────────────────────────────────────────────────
export interface ChatSession {
  id: string;
  userId: string;
  repoId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ── API Responses ─────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}
