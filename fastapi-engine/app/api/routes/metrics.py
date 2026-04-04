from fastapi import APIRouter, Depends
from app.core.security import verify_token

router = APIRouter()

@router.get("/{repo_id}")
async def get_metrics(repo_id: str, user=Depends(verify_token)):
    return {"message": "metrics stub", "repo_id": repo_id}
