from fastapi import APIRouter, Depends
from app.core.security import verify_token

router = APIRouter()

@router.get("/dependency/{repo_id}")
async def get_dependency_graph(repo_id: str, user=Depends(verify_token)):
    return {"message": "graph stub", "repo_id": repo_id}
