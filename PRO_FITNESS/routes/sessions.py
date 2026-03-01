from fastapi import APIRouter
from db import execute
from pydantic import BaseModel
from datetime import datetime, timedelta


router = APIRouter()

class Sessions(BaseModel):
    client_id: int
    trainer_id: int
    membership_id: int
    scheduled_at:datetime
    duration_min:int
    notes: str



@router.get('/sessions', tags=['sessions'])
def get_sessions():
    print("Fetching Sessions")
    query = "SELECT * FROM sessions"
    try:
        response = execute(query=query, fetch=True)
        return {'message': f'Here are all the sessions: {response[0]}'}
    except Exception as e:
        return {'message': f'Exception {e} occured'}


@router.post('/sessions', tags=['sessions'])
def post_sessions(sessions:Sessions):
    print("Adding sessions")


    query = "INSERT INTO sessions (client_id,trainer_id,membership_id, scheduled_at, duration_min, notes) VALUES (%s,%s,%s,%s,%s,%s)"

    try:
        response = execute(query=query, params=(sessions.client_id, sessions.trainer_id,sessions.membership_id,sessions.scheduled_at,sessions.duration_min,sessions.notes))

        return {'message': f'New Session Added','id': response}

    except Exception as e:
        return {'message': 'Error {e} occured'}
