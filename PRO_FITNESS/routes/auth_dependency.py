from fastapi import Depends, HTTPException, Header, Request
import jwt
import os
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import logging


logger = logging.getLogger(__name__)

JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        logger.info(f"User authenticated: {payload}")
        return payload
    except jwt.ExpiredSignatureError:
        logger.error("Token Expired")
        raise HTTPException(status_code=401, detail="Token Expired")
    except jwt.InvalidTokenError:
        logger.error("Invalid token")
        raise HTTPException(status_code=401, detail="Invalid token")

# For public routes — returns None if no token
def get_optional_user(request: Request):
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        logger.info("No token provided")
        return None
    try:
        token = auth.split(" ")[1]
        logger.info(f"Decoding token: {token}")
        return jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
    except Exception as e:
        logger.error(f"Error decoding token: {e}")
        return None


def require_role(*allowed_roles):
    def checker(user=Depends(get_current_user)):
        if user['role'] not in allowed_roles:
            logger.error(f"Access denied for user: {user['role']}")
            raise HTTPException(status_code=403, detail="Access Denied")
        logger.info(f"Access granted for user: {user['role']}")
        return user
    return checker



    
