from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from routes.auth_dependency import require_role
from db import execute
import bcrypt

router = APIRouter()

class Change_Password(BaseModel):
    original_password: str
    new_password: str



@router.post('/change-password', tags=['password'])
def change_password(data: Change_Password, user = Depends(require_role("admin","trainer","client"))):
    
    db_user = execute(query="SELECT * FROM users WHERE id = %s", params=(user['user_id'],), fetch=True)

    if not bcrypt.checkpw(data.original_password.encode('utf-8'), db_user[0]['password_hash'].encode('utf-8')):
        raise HTTPException(status_code=400, detail="Current Password is Incorrect")
    
    new_hash_password = bcrypt.hashpw(data.new_password.encode('utf-8'), bcrypt.gensalt(rounds=10)).decode('utf-8')

    execute(query="UPDATE users SET password_hash = %s WHERE id = %s", params=(new_hash_password, user['user_id']))
    return {'message': 'Password updated successfully'}



    

