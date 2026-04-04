-- ============================================================
-- groove-ai — PostgreSQL Schema
-- Run with: psql -U postgres -d grooveai -f schema.sql
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT,                          -- NULL for OAuth-only accounts
    name          VARCHAR(255),
    avatar_url    TEXT,
    provider      VARCHAR(50) DEFAULT 'local',   -- 'local' | 'google'
    provider_id   VARCHAR(255),
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Repositories ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS repositories (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    repo_url      TEXT NOT NULL,
    name          VARCHAR(255) NOT NULL,
    description   TEXT,
    status        VARCHAR(50) DEFAULT 'pending',  -- pending | ingesting | parsed | embedded | ready | error
    error_msg     TEXT,
    cloned_path   TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (owner_id, repo_url)
);

-- ── Code Chunks ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS code_chunks (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repo_id       UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    file_path     TEXT NOT NULL,
    extension     VARCHAR(20),
    content       TEXT NOT NULL,
    chunk_index   INTEGER DEFAULT 0,
    embedding_id  TEXT,                           -- reference to FAISS vector id
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Analysis Results ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analysis_results (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repo_id       UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    analysis_type VARCHAR(100) NOT NULL,          -- 'summary' | 'graph' | 'dependencies' | 'qa'
    result        JSONB,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Chat Sessions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_sessions (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    repo_id       UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    title         VARCHAR(255),
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Chat Messages ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id    UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role          VARCHAR(20) NOT NULL,           -- 'user' | 'assistant'
    content       TEXT NOT NULL,
    metadata      JSONB,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_repos_owner   ON repositories(owner_id);
CREATE INDEX IF NOT EXISTS idx_chunks_repo   ON code_chunks(repo_id);
CREATE INDEX IF NOT EXISTS idx_chunks_file   ON code_chunks(repo_id, file_path);
CREATE INDEX IF NOT EXISTS idx_analysis_repo ON analysis_results(repo_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_repo ON chat_sessions(repo_id);
CREATE INDEX IF NOT EXISTS idx_messages_sess ON chat_messages(session_id);
