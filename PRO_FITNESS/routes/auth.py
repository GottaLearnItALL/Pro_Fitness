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
        params = (data.f_name, data.l_name, data.email, data.phone, data.address, 'client', hashed_password)
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
        if not response:
            return {"message": "Incorrect email or password. Please try again."}

        user = response[0]
        password_hash = user.get('password_hash')

        if not password_hash:
            return {"message": "Incorrect email or password. Please try again."}

        try:
            match = bcrypt.checkpw(data.password.encode('utf-8'), password_hash.encode('utf-8'))
        except Exception:
            return {"message": "Incorrect email or password. Please try again."}

        if not match:
            return {"message": "Incorrect email or password. Please try again."}

        token = jwt.encode(
            {"user_id": user['id'], "role": user['role'], "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
            JWT_SECRET_KEY,
            algorithm="HS256"
        )
        return {'message': 'Login successful', 'token': token, 'role': user['role'], 'user_id': user['id'], 'first_name': user['first_name']}

    except Exception as e:
        return {"message": "Incorrect email or password. Please try again."}