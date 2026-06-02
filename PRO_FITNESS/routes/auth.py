from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db import execute
import bcrypt
import jwt
import os
from datetime import datetime, timedelta, timezone
import secrets
import resend
import phonenumbers
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')
RESEND_KEY = os.getenv("RESEND_API_KEY")
class Register(BaseModel):
    f_name: str
    l_name: str
    email: str
    phone: str
    address: str
    role: str
    password: str
    timezone: str


class Login(BaseModel):
    email: str
    password: str


def normalize_phone(phone: str) -> str:
    parsed = phonenumbers.parse(phone, "US")  # US as default if no country code
    return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)

@router.post('/register', tags=['auth'])
def register(data: Register):
    try:
        password = bcrypt.gensalt(rounds=10)
        hashed_password = bcrypt.hashpw(data.password.encode('utf-8'), password)
        phone = normalize_phone(data.phone)
        query = """ INSERT INTO users (first_name, last_name, email, phone, address, role, password_hash, timezone) VALUES (%s, %s, %s, %s, %s, %s, %s, %s) """
        params = (data.f_name, data.l_name, data.email, phone, data.address, data.role, hashed_password, data.timezone)
        response = execute(query=query, params=params)
        logger.info('User Registered: id=%s, role=%s, email=%s', response, data.role, data.email)
        return {'message': f'User registered successfully', 'id': response}
    except Exception as e:
        logger.error("Could Not Register User: %s", str(e))
        return {'message': 'Registration Failed. Please try again'}



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

        match = bcrypt.checkpw(data.password.encode('utf-8'), password_hash.encode('utf-8'))
       
            

        if not match:
            logger.warning("Failed login attempt for email: %s", data.email)
            return {"message": "Incorrect email or password. Please try again."}
            

        token = jwt.encode(
            {"user_id": user['id'], "role": user['role'], "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
            JWT_SECRET_KEY,
            algorithm="HS256"
        )
        logger.info("User logged in: id=%s role=%s", user['id'], user['role'])
        return {'message': 'Login successful', 'token': token, 'role': user['role'], 'user_id': user['id'], 'first_name': user['first_name']}

    except Exception as e:
        logger.error("Login Error for email %s: %s", data.email, str(e))
        return {"message": "Incorrect email or password. Please try again."}



# Forgot Password Enpoints

class Forgot_Password(BaseModel):
    email: str


@router.post('/forgot_password', tags=['forgot_password'])
def forgot_password(data: Forgot_Password):
    
    user_id_query = "SELECT id FROM users WHERE email = %s"
    user = execute(query=user_id_query, params=(data.email,), fetch=True)

    if not user:
        logger.info('Password reset request for unknown email: %s', data.email)
        return {"message": "If email exist, a reset link has been test"}
    
    # Invalidate previous tokens
    execute("UPDATE password_reset_tokens SET used = TRUE WHERE user_id = %s", params=(user[0]['id'],))

    #Generate new token
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    execute(
        query="INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (%s, %s, %s)", params=(user[0]['id'], token, expires_at), fetch=False
    )

    logger.info("Password reset token generated for user: id=%s", user[0]['id'])
    
    reset_link = f"http://localhost:3000/reset-password?token={token}"

    resend.api_key = RESEND_KEY

    params: resend.Emails.SendParams = {
    "from": "onboarding@resend.dev",
    "to": "iamkami.2023@gmail.com",
    "subject": "Reset Your Password",
    "html": f"<a href='{reset_link}'>Reset Password</a>"
    }

    email = resend.Emails.send(params)
    logger.info("Password reset link has been sent succesfully to : %s", data.email)
    return {"message": "Reset Link has been sent to your email!", "dev_token": token}


# Resetting the password

class Reset_Password(BaseModel):
    token: str
    new_password: str

@router.post('/reset-password', tags=['forgot_password'])
def reset_password(data: Reset_Password):

    try:
        token_record = execute(query="SELECT * FROM password_reset_tokens WHERE token = %s AND used = FALSE", params=(data.token,), fetch=True)

        if not token_record:
            logger.warning("Invalid Token")
            raise HTTPException(status_code=400, detail="Invalid Token")
        
        if datetime.now(timezone.utc) > token_record[0]['expires_at'].replace(tzinfo=timezone.utc):
            logger.warning("Token has expired")
            raise HTTPException(status_code=400, detail="Token has expired")
        
        new_password = bcrypt.hashpw(data.new_password.encode('utf-8'), bcrypt.gensalt(rounds=10)).decode('utf-8')

        #Update the password
        execute(query="UPDATE users SET password_hash = %s WHERE id = %s", params=(new_password, token_record[0]['user_id']))
        logger.info("Password Succesfully reset for user: id=%s", token_record[0]['user_id'])
        execute("UPDATE password_reset_tokens SET used = TRUE WHERE token = %s", (data.token,))
        
        return {"message": "Password has been Reset Succesfully!"}
    except Exception as e:
        logger.error("Password reset error: %s", str(e))
    
