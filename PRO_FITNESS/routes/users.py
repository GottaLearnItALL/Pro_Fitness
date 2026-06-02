from datetime import datetime
from fastapi import APIRouter, Depends
from db import execute
from pydantic import BaseModel
from routes.auth_dependency import get_current_user, require_role
import logging

logger = logging.getLogger(__name__)


class User(BaseModel):
    f_name: str
    l_name: str
    email: str
    phone: str
    address: str
    role: str
    

class UserUpdate(BaseModel):
    f_name: str | None = None
    l_name: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None


router = APIRouter()


@router.get('/users/trainers/', tags=['users'])
def get_trainers(user=Depends(get_current_user)):
    """Returns id + name of all trainers — accessible to any authenticated user."""
    query = "SELECT id, first_name, last_name FROM users WHERE role = 'trainer' AND is_active=TRUE"
    try:
        response = execute(query=query, fetch=True)
        return {"message": "Trainers fetched successfully", "Data": response or []}
    except Exception as e:
        return {"message": f"Error {e}", "Data": []}


@router.get('/users/', tags=['users'])
def get_users(user=Depends(require_role("admin"))):
    logger.info("Fetching all users")
    query = "SELECT * FROM users WHERE is_active=TRUE"
    try:
        response = execute(query=query,fetch=True)
        if response:
            logger.info(f"Fetched {len(response)} users")
            return {"message": "User data fetched successfully!", "Data": response}
        else:
            logger.info("No users found")
            return {"message": "Database is Empty!"}
    except Exception as e:
        logger.error(f"Error fetching users: {e}")
       
 
@router.post('/users/', tags=['users'])
def create_users(user: User, user_=Depends(require_role("admin"))):
    logger.info(f"Creating user: {user.email} role={user.role}")
    query = """ INSERT INTO users
    (first_name, last_name, email, phone, address, role)
    VALUES (%s,%s,%s,%s,%s,%s)
    """
    try:
        response = execute(query=query, params=(user.f_name,user.l_name,user.email,user.phone,user.address,user.role))
        logger.info(f"User created id={response} role={user.role}")
        return {"message": f"Item {user.role} added to the DataBase!",'id': response}
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        return(f"Error: Invalid input data. Details: {e}")


@router.put('/users/{user_id}', tags=['users'])
def update_user(user_id: int, user: UserUpdate, user_=Depends(require_role("admin"))):
    logger.info(f"Updating user id={user_id}")
    fields = []
    params = []
    if user.f_name:
        fields.append("first_name = %s")
        params.append(user.f_name)
    if user.l_name:
        fields.append("last_name = %s")
        params.append(user.l_name)
    if user.email:
        fields.append("email = %s")
        params.append(user.email)
    if user.phone:
        fields.append("phone = %s")
        params.append(user.phone)
    if user.address:
        fields.append("address = %s")
        params.append(user.address)
    params.append(user_id)
    query = f"UPDATE users SET {', '.join(fields)} WHERE id = %s"
    try:
        response = execute(query=query, params=params)
        logger.info(f"User id={user_id} updated successfully")
        return{'messages': 'User updated succesfully'}
    except Exception as e:
        logger.error(f"Error updating user id={user_id}: {e}")
        return(f"Error: Invalid input data. Details: {e}")


@router.delete('/users/{user_id}', tags=['users'])
def delete_user(user_id: int, user=Depends(require_role("admin"))):
    logger.info(f"Deactivating user id={user_id}")
    query = "UPDATE users SET is_active = False WHERE id=%s"

    try:
        response = execute(query=query, params=(user_id,))
        logger.info(f"User id={user_id} deactivated")
        return {'messages': 'User Deactivated succesfully'}
    except Exception as e:
        logger.error(f"Error deactivating user id={user_id}: {e}")
        return(f"Error: Invalid input data. Details: {e}")