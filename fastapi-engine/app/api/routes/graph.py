from fastapi import APIRouter, Depends
from app.core.security import verify_token

router = APIRouter()

from app.core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import logging

logger = logging.getLogger(__name__)

@router.get("/dependency/{repo_id}")
async def get_dependency_graph(
    repo_id: str, 
    db: AsyncSession = Depends(get_db)
):
    """
    Get file dependency nodes and edges for visualizing the codebase map.
    """
    try:
        # 1. Fetch File Nodes from Postgres (as source of truth for existing files)
        result = await db.execute(
            text('SELECT DISTINCT "filePath" as id, "filePath" as label FROM code_chunks WHERE "repoId" = :repo_id'),
            {"repo_id": repo_id}
        )
        nodes = [dict(row) for row in result.mappings().all()]
        
        if not nodes:
            return {"nodes": [], "edges": []}

        # 2. Try fetching edges from Neo4j
        edges = []
        try:
            from app.services.graph_service import get_graph_service
            graph = get_graph_service()
            # Fetch relationships (simplified node path)
            query = """
            MATCH (f1:File {repo_id: $repo_id})-[r:DEPENDS_ON]->(f2:File {repo_id: $repo_id})
            RETURN f1.path as source, f2.path as target, type(r) as type
            """
            # Using execute_query if provided by core.neo4j
            res = await graph.neo4j.execute_query(query, {"repo_id": repo_id})
            if res:
                edges = [dict(r) for r in res]
        except Exception as neo_err:
            logger.warning(f"Neo4j edges fetch failed or empty: {neo_err}")
            # Edges stay empty but we return nodes

        return {"nodes": nodes, "edges": edges}
    except Exception as e:
        logger.error(f"Error in get_dependency_graph: {e}")
        raise HTTPException(status_code=500, detail=str(e))
