// ============================================================
// groove-ai — Neo4j Uniqueness Constraints
// Run with: cypher-shell -u neo4j -p <password> -f constraints.cypher
// ============================================================

// Repositories
CREATE CONSTRAINT repo_id_unique IF NOT EXISTS
FOR (r:Repository) REQUIRE r.id IS UNIQUE;

// Files
CREATE CONSTRAINT file_path_unique IF NOT EXISTS
FOR (f:File) REQUIRE (f.repo_id, f.path) IS NODE KEY;

// Functions / Classes
CREATE CONSTRAINT function_id_unique IF NOT EXISTS
FOR (fn:Function) REQUIRE fn.id IS UNIQUE;

CREATE CONSTRAINT class_id_unique IF NOT EXISTS
FOR (c:Class) REQUIRE c.id IS UNIQUE;

// Modules
CREATE CONSTRAINT module_id_unique IF NOT EXISTS
FOR (m:Module) REQUIRE m.id IS UNIQUE;
