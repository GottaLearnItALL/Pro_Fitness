from fastapi import APIRouter
from db import execute
from pydantic import BaseModel
from datetime import date, timedelta
from routes.auth_dependency import require_role
from fastapi import Depends


router = APIRouter()

class Attendance(BaseModel):
    session_id: int
    user_id: int
    role: str
    check_in: date
    status: str



@router.get('/attendance', tags=['attendance'])
def get_attendance(user=Depends(require_role("admin","client","trainer"))):
    print("Fetching Attendance")
    query = "SELECT * FROM attendance"
    try:
        response = execute(query=query, fetch=True)
        return {'message': f'Here are the attedance: {response[0]}'}
    except Exception as e:
        return {'message': f'Exception {e} occured'}


@router.post('/attendance', tags=['attendance'])
def post_attendance(attendance:Attendance, user=Depends(require_role("admin","trainer"))):
    print("Recording Attendance")


    query = "INSERT INTO attendance (session_id, user_id, role, check_in, status) VALUES (%s,%s,%s,%s,%s)"

    try:
        response = execute(query=query, params=(attendance.session_id, attendance.user_id, attendance.role, attendance.check_in, attendance.status))

        if attendance.role == 'client':
            membership = execute(
                query="SELECT id, sessions_remaining FROM memberships WHERE client_id = %s AND status = 'active'",
                params=(attendance.user_id,), fetch=True
            )
            if membership and membership[0]['sessions_remaining'] is not None:
                updated_sessions = membership[0]['sessions_remaining'] - 1
                execute(
                    query="UPDATE memberships SET sessions_remaining = %s WHERE id = %s",
                    params=(updated_sessions, membership[0]['id'])
                )

        return {'message': 'Attendance Recorded', 'id': response}

    except Exception as e:
        return {'message': f'Error {e} occurred'}


