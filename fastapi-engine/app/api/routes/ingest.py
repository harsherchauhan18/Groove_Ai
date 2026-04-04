from fastapi import APIRouter, Depends
from app.core.security import verify_token

router = APIRouter()

@router.post("/clone")
async def clone_repo(payload: dict, user=Depends(verify_token)):
    return {"message": "clone stub", "user_id": user.get("id")}
