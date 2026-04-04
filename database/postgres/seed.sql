-- ============================================================
-- groove-ai — PostgreSQL Seed Data (development only)
-- Run AFTER schema.sql
-- ============================================================

-- Insert a demo admin user (password: "password" hashed with bcrypt)
INSERT INTO users (id, email, password_hash, name, provider, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@groove-ai.dev',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/OdqYhqoIGKw7Z3hqS',  -- "password"
    'Admin User',
    'local',
    TRUE
)
ON CONFLICT (email) DO NOTHING;

-- Insert a demo repository entry
INSERT INTO repositories (id, owner_id, repo_url, name, description, status)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'https://github.com/torvalds/linux',
    'linux',
    'Linux kernel source (demo seed)',
    'pending'
)
ON CONFLICT DO NOTHING;
