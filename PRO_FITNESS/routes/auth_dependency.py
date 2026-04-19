from fastapi import Depends, HTTPException, Header
import jwt
import os
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')

security = HTTPBearer()

def get_current_user(credentials:HTTPAuthorizationCredentials = Depends(security)): # Required header (...)
    print(credentials.credentials)
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        print(payload)
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token Expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_role(*allowed_roles):
    def checker(user=Depends(get_current_user)):
        if user['role'] not in allowed_roles:
            raise HTTPException(status_code=403, detail="Access Denied")
        return user
    return checker




