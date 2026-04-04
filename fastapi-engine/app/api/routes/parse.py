from fastapi import APIRouter, Depends
from app.core.security import verify_token

router = APIRouter()

@router.get("/tree/{repo_id}")
async def get_tree(repo_id: str, user=Depends(verify_token)):
    return {"message": "parse stub", "repo_id": repo_id}
