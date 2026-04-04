from fastapi import APIRouter, Depends
from app.core.security import verify_token

router = APIRouter()

@router.post("/index")
async def embed_repo(payload: dict, user=Depends(verify_token)):
    return {"message": "embed stub"}
