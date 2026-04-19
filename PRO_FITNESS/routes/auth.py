from fastapi import APIRouter
from pydantic import BaseModel
from db import execute
import bcrypt
import jwt
import os
from datetime import datetime, timedelta, timezone

router = APIRouter()

JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')

class Register(BaseModel):
    f_name: str
    l_name: str
    email: str
    phone: str
    address: str
    role: str
    password: str


class Login(BaseModel):
    email: str
    password: str

@router.post('/register', tags=['auth'])
def register(data: Register):
    try:
        password = bcrypt.gensalt(rounds=10)
        hashed_password = bcrypt.hashpw(data.password.encode('utf-8'), password)
        query = """ INSERT INTO users (first_name, last_name, email, phone, address, role, password_hash) VALUES (%s, %s, %s, %s, %s, %s, %s) """
        params = (data.f_name, data.l_name, data.email, data.phone, data.address, data.role, hashed_password)
        response = execute(query=query, params=params)
        return {'message': f'User registered successfully {response}'}
    except Exception as e:
        return {'message': f'Error: {e}'}


@router.post('/login', tags=['auth'])
def login(data: Login):
    try:
        query = "SELECT * FROM users WHERE email = %s"
        params = (data.email,)
        response = execute(query=query, params=params, fetch=True)
        if response:
            password = data.password.encode('utf-8')
            if bcrypt.checkpw(password, response[0]['password_hash'].encode('utf-8')):
                token = jwt.encode(
                    {"user_id": response[0]['id'], "role": response[0]['role'], "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
                    JWT_SECRET_KEY,
                    algorithm="HS256"
                )
                return {'message': f'Login successful {token}'}
            else:
                return {"message": "Invalid Credentials"}
        else:
            return {"message": "User not found"}
    except Exception as e:
        return {"message": f"Error: {e}"}