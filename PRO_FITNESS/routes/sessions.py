from fastapi import APIRouter
from db import execute
from pydantic import BaseModel
from datetime import datetime, timedelta
from routes.auth_dependency import require_role
from fastapi import Depends

router = APIRouter()

class Sessions(BaseModel):
    client_id: int
    trainer_id: int
    membership_id: int
    scheduled_at:datetime
    duration_min:int
    notes: str

class SessionUpdate(BaseModel):
    status: str | None = None
    notes: str | None = None



@router.get('/sessions', tags=['sessions'])
def get_sessions(user=Depends(require_role("admin","trainer","client"))):
    print("Fetching Sessions")
    query = "SELECT * FROM sessions"
    try:
        response = execute(query=query, fetch=True)
        return {'message': 'Sessions fetched successfully', 'Data': response}
    except Exception as e:
        return {'message': f'Exception {e} occured'}


@router.post('/sessions', tags=['sessions'])
def post_sessions(sessions:Sessions, user=Depends(require_role("admin", "client"))):
    print("Adding sessions")


    query = "INSERT INTO sessions (client_id,trainer_id,membership_id, scheduled_at, duration_min, notes) VALUES (%s,%s,%s,%s,%s,%s)"

    try:
        response = execute(query=query, params=(sessions.client_id, sessions.trainer_id,sessions.membership_id,sessions.scheduled_at,sessions.duration_min,sessions.notes))

        return {'message': f'New Session Added','id': response}

    except Exception as e:
        return {'message': 'Error {e} occured'}


@router.put('/sessions/{session_id}', tags=['sessions'])
def update_session(session_id: int, session: SessionUpdate, user=Depends(require_role("admin","client"))):
    fields, params = [], []
    if session.status is not None:
        fields.append("status = %s")
        params.append(session.status)
    if session.notes is not None:
        fields.append("notes = %s")
        params.append(session.notes)
    if not fields:
        return {'message': 'Nothing to update'}
    params.append(session_id)
    query = f"UPDATE sessions SET {', '.join(fields)} WHERE id = %s"
    try:
        execute(query=query, params=params)
        return {'message': 'Session updated successfully'}
    except Exception as e:
        return {'message': f'Error {e} occurred'}
