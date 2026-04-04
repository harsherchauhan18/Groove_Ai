from neo4j import AsyncGraphDatabase
from app.core.config import get_settings

settings = get_settings()

class Neo4jManager:
    def __init__(self):
        self.driver = AsyncGraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD)
        )

    async def close(self):
        await self.driver.close()

    async def execute_query(self, query: str, parameters: dict = None):
        """
        Execute an async query in a managed session.
        """
        async with self.driver.session() as session:
            result = await session.run(query, parameters)
            # Fetch all results so session can close safely
            return await result.data()

neo4j_manager = Neo4jManager()

def get_neo4j():
    return neo4j_manager
