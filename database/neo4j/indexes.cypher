// ============================================================
// groove-ai — Neo4j Indexes
// Run AFTER constraints.cypher
// ============================================================

// Full-text search on code content
CREATE FULLTEXT INDEX chunk_content_fulltext IF NOT EXISTS
FOR (n:CodeChunk) ON EACH [n.content];

// Lookup index on repo_id for fast traversal
CREATE INDEX repo_lookup IF NOT EXISTS
FOR (r:Repository) ON (r.id);

// Lookup index on file path
CREATE INDEX file_path_lookup IF NOT EXISTS
FOR (f:File) ON (f.path);

// Lookup index on function name (for cross-repo analysis)
CREATE INDEX function_name_lookup IF NOT EXISTS
FOR (fn:Function) ON (fn.name);
