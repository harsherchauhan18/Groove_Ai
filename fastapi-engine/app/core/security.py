from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from app.core.config import get_settings

settings = get_settings()
bearer_scheme = HTTPBearer()


def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    Validates the Bearer JWT issued by node-api.
    Returns the decoded payload if valid.
    """
    token = credentials.credentials
    try:
        print(f"[SECURITY] Validating token: {token[:10]}...{token[-10:]}")
        print(f"[SECURITY] Using secret: {settings.JWT_SECRET}")
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=["HS256"],
        )
        return payload
    except jwt.ExpiredSignatureError as e:
        print(f"[SECURITY] Token expired: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token expired.",
        )
    except jwt.InvalidTokenError as e:
        print(f"[SECURITY] Invalid token error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token.",
        )


def require_admin(payload: dict = Depends(verify_token)) -> dict:
    if payload.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return payload
