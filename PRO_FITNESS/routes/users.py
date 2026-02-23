from datetime import datetime
from fastapi import APIRouter
from db import execute
from pydantic import BaseModel


class User(BaseModel):
    f_name: str
    l_name: str
    email: str
    phone: str
    address: str
    role: str
    is_active: bool
    created_at: datetime


router = APIRouter()



@router.get('/users/', tags=['users'])
def get_users():
    query = "SELECT * FROM USERS"
    try:
        response = execute(query=query,fetch=True)
        if response:
            for _ in response:
                print(_)
        else:
            return {"message": "Database is Empty!"}


    except Exception as e:
        print(f'Exception {e} was caught')
        

@router.post('/users/', tags=['users'])
def create_users(user: User):
    print("Entering post")
    query = """ INSERT INTO users 
    (f_name, l_name, email, phone, address, role, is_active, created_at)
    VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
    """
    try:
        response = execute(query=query, params=(user.f_name,user.l_name,user.email,user.phone,user.address,user.role,user.is_active,user.created_at))
        print(response)
        return {"message": f"Item {user.role} added to the DataBase!"}
    except Exception as e:
        return response
        #return(f"Error: Invalid input data. Details: {e}")
    