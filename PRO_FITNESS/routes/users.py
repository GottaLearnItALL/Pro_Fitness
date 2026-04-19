from datetime import datetime
from fastapi import APIRouter, Depends
from db import execute
from pydantic import BaseModel
from routes.auth_dependency import get_current_user, require_role


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


@router.get('/users/', tags=['users'])
def get_users(user=Depends(require_role("admin"))):
    print("Entering get")
    query = "SELECT * FROM users"
    try:
        response = execute(query=query,fetch=True)
        if response:
            return {"message": "User data fetched successfully!", "Data": response}
        else:
            return {"message": "Database is Empty!"}
    except Exception as e:
        print(f'Exception {e} was caught')
       
 
@router.post('/users/', tags=['users'])
def create_users(user: User, user_=Depends(require_role("admin"))):
    print("Entering post")
    query = """ INSERT INTO users 
    (first_name, last_name, email, phone, address, role)
    VALUES (%s,%s,%s,%s,%s,%s)
    """
    try:
        response = execute(query=query, params=(user.f_name,user.l_name,user.email,user.phone,user.address,user.role))
        print(response)
        return {"message": f"Item {user.role} added to the DataBase!",'id': response}
    except Exception as e:
        return(f"Error: Invalid input data. Details: {e}")


@router.put('/users/{user_id}', tags=['users'])
def update_user(user_id: int, user: UserUpdate, user_=Depends(require_role("admin"))):
    print("Entering put")
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
        print(response)
        return{'messages': 'User updated succesfully'}
    except Exception as e:
        return(f"Error: Invalid input data. Details: {e}")


@router.delete('/users/{user_id}', tags=['users'])
def delete_user(user_id: int, user=Depends(require_role("admin"))):
    print("Entering Delete")
    query = f"DELETE FROM users WHERE id = %s"

    try:
        response = execute(query=query, params=(user_id,))
        return {'messages': 'User deleted succesfully'}
    except Exception as e:
        return(f"Error: Invalid input data. Details: {e}")