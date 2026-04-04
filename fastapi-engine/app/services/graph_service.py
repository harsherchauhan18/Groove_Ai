import re
from app.core.neo4j import get_neo4j

class GraphService:
    def __init__(self):
        self.neo4j = get_neo4j()

    async def add_repository(self, repo_id: str, name: str):
        query = "MERGE (r:Repository {id: $id}) SET r.name = $name RETURN r"
        await self.neo4j.execute_query(query, {"id": repo_id, "name": name})

    async def add_file(self, repo_id: str, file_path: str):
        query = """
        MERGE (f:File {repo_id: $repo_id, path: $path})
        WITH f
        MATCH (r:Repository {id: $repo_id})
        MERGE (r)-[:CONTAINS]->(f)
        RETURN f
        """
        await self.neo4j.execute_query(query, {"repo_id": repo_id, "path": file_path})

    async def add_dependency(self, repo_id: str, from_path: str, to_path: str):
        query = """
        MATCH (f1:File {repo_id: $repo_id, path: $from_path})
        MATCH (f2:File {repo_id: $repo_id, path: $to_path})
        MERGE (f1)-[:DEPENDS_ON]->(f2)
        """
        await self.neo4j.execute_query(query, {"repo_id": repo_id, "from_path": from_path, "to_path": to_path})

    def extract_imports(self, content: str, extension: str):
        """
        Naive import extraction using regex.
        """
        imports = []
        if extension in ['.py']:
            # import x, from x import y
            matches = re.findall(r'^import\s+([\w\.]+)', content, re.MULTILINE)
            imports.extend(matches)
            matches = re.findall(r'^from\s+([\w\.]+)\s+import', content, re.MULTILINE)
            imports.extend(matches)
        elif extension in ['.js', '.jsx', '.ts', '.tsx']:
            # import x from 'y', require('y')
            matches = re.findall(r'import\s+.*\s+from\s+[\'"](.+)[\'"]', content)
            imports.extend(matches)
            matches = re.findall(r'require\([\'"](.+)[\'"]\)', content)
            imports.extend(matches)
        return list(set(imports))

graph_service = GraphService()

def get_graph_service():
    return graph_service
