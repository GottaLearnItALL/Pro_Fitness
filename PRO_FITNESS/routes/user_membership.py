from fastapi import APIRouter
from db import execute
from pydantic import BaseModel
from datetime import date, timedelta
from routes.auth_dependency import require_role
from fastapi import Depends

router = APIRouter()

class Membership(BaseModel):
    client_id: int 
    plan_id: int
    start_date: date




@router.get('/memberships/me', tags=['user_membership'])
def get_my_membership(user=Depends(require_role("client"))):
    """Returns the logged-in client's own membership only."""
    query = "SELECT * FROM memberships WHERE client_id = %s ORDER BY id DESC LIMIT 1"
    try:
        response = execute(query=query, params=(user['user_id'],), fetch=True)
        return {'message': 'Membership fetched successfully', 'Data': response}
    except Exception as e:
        return {'message': f'Exception {e} occured', 'Data': []}


@router.get('/memberships', tags=['user_membership'])
def get_memberships(user=Depends(require_role("admin"))):
    print("Fetching Memberships")
    query = "SELECT * FROM memberships"
    try:
        response = execute(query=query, fetch=True)
        return {'message': 'Memberships fetched successfully', 'Data': response}
    except Exception as e:
        return {'message': f'Exception {e} occured'}


@router.post('/memberships', tags=['user_membership'])
def post_memberships(membership:Membership, user=Depends(require_role("admin","client"))):
    print("Add memberships")
    get_sessions_limits_query = "SELECT * FROM membership_plans WHERE id = %s"
    plan = execute(query=get_sessions_limits_query, params=(membership.plan_id,), fetch=True)

    sessions_remaining = plan[0]['session_limit']
    duration_days = plan[0]['duration_days']
    end_date = membership.start_date + timedelta(days=duration_days)

    query = "INSERT INTO memberships (client_id,plan_id, start_date, end_date, sessions_remaining) VALUES (%s,%s,%s,%s,%s)"

    try:
        response = execute(query=query, params=(membership.client_id, membership.plan_id, membership.start_date, end_date, sessions_remaining))
        return {'message': f'Subscribed to {plan[0]['name']}','id': response}

    except Exception as e:
        return {'message': 'Error {e} occured'}
