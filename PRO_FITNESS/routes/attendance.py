from fastapi import APIRouter
from db import execute
from pydantic import BaseModel
from datetime import date, timedelta


router = APIRouter()

class Attendance(BaseModel):
    session_id: int
    user_id: int
    role: str
    check_in: date
    status: str



@router.get('/attendance', tags=['attendance'])
def get_attendance():
    print("Fetching Attendance")
    query = "SELECT * FROM attendance"
    try:
        response = execute(query=query, fetch=True)
        return {'message': f'Here are the attedance: {response[0]}'}
    except Exception as e:
        return {'message': f'Exception {e} occured'}


@router.post('/attendance', tags=['attendance'])
def post_attendance(attendance:Attendance):
    print("Recording Attendance")


    query = "INSERT INTO attendance (session_id, user_id, role, check_in, status) VALUES (%s,%s,%s,%s,%s)"

    try:
        response = execute(query=query, params=(attendance.session_id, attendance.user_id, attendance.role, attendance.check_in, attendance.status))
        sessions = execute(query="SELECT sessions_remaining FROM memberhsip",fetch=True)
        updated_session = sessions[0]['sessions_limit']
        updated_session -= 1
        response = execute(query="UPDATE memberhsips SET sessions_limit = %s WHERE client_id = %s", params=(pdated_session, attendance.user_id))


        return {'message': f'Attendance Recorded','id': response}

    except Exception as e:
        return {'message': 'Error {e} occured'}


