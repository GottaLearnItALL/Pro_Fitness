from datetime import datetime, timedelta, timezone
from email import message
import random
import token
from db import execute
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from twilio.rest import Client
import os
from dotenv import load_dotenv
import jwt
import logging


logger = logging.getLogger(__name__)

load_dotenv()

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")

router = APIRouter()



class Data(BaseModel):
    phone: str
    


class OTPVerify(BaseModel):
    phone: str
    code: str

@router.post('/auth/request-otp', tags=['OTP'])
def otp_generator(data:Data):
    try:
        user = execute("SELECT id FROM users WHERE phone = %s", params=(data.phone,), fetch=True)
        if user:
            execute(query="UPDATE otp_tokens SET used=True WHERE phone=%s",params=(data.phone,))
            new_otp_code = random.randint(100000, 999999)
            expiry_date = datetime.now(timezone.utc) + timedelta(minutes=5)

            response = execute("INSERT INTO otp_tokens (phone, code, expires_at) VALUES (%s, %s, %s)", params=(data.phone, new_otp_code, expiry_date), fetch=False)
            
            # account_sid = os.getenv("ACCOUNT_SID")
            # auth_token = os.getenv("AUTH_TOKEN")

            # client = Client(account_sid, auth_token)
            # message = client.messages.create(
            #     body=f"Your Haachiko Fitness code is {new_otp_code}",
            #     from_="+18567265748",
            #     to= data.phone
            # )
            
            logger.info("OTP sent to %s", data.phone)
            return {'message': 'OTP has been sent!', 'dev_otp': new_otp_code}
        
        logger.warning("Unkown number request for OTP: %s", data.phone)
        return {'message': 'OTP has been sent!'}

        
    except Exception as e:
        logger.error("Error in generating OTP %s", str(e))
        return {'message': 'Error in generating OTP', 'error':e}



@router.post('/auth/verify-otp', tags=['OTP'])
def verify_otp(data: OTPVerify):
    try:
        otp_found = execute("SELECT * FROM otp_tokens WHERE phone=%s AND code=%s AND used=FALSE", params=(data.phone, data.code),fetch=True)

        if not otp_found:
            logger.warning("Invalid or Expired Code. Try again!")
            raise HTTPException(status_code=400, detail="Invalid or Expired Code")
        
        if otp_found[0]['expires_at'].replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            logger.warning("Expired Code!")
            raise HTTPException(status_code=400, detail="Code has expired")
        
        execute("UPDATE otp_tokens SET used=TRUE WHERE phone=%s", params=(data.phone,))

        user = execute("SELECT * FROM users WHERE phone = %s", params=(data.phone,), fetch=True)
        logger.info("Succesfully Verified OTP! for phone=%s", data.phone)
        token = jwt.encode(
            {'user_id': user[0]['id'], 'role':user[0]['role'], 'exp': datetime.now(timezone.utc)+timedelta(hours=1)},
            JWT_SECRET_KEY,
            algorithm='HS256'
        )
        logger.info("Login succesful using OTP for user: %s", user[0]['id'])
        return {'message': 'Login successful', 'token': token, 'role': user[0]['role'], 'user_id': user[0]['id'], 'first_name': user[0]['first_name']}
    except Exception as e:
        logger.error("OTP Verfication error: %s", {e})
        return {'message': 'OTP could not be verified. Try Again!'}



