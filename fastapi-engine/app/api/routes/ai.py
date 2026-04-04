from fastapi import APIRouter, Depends
from app.core.security import verify_token

router = APIRouter()

@router.post("/explain")
async def explain_code(payload: dict, user=Depends(verify_token)):
    return {"message": "ai stub"}
