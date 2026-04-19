from fastapi import APIRouter
from db import execute
from pydantic import BaseModel
from routes.auth_dependency import require_role
from fastapi import Depends


router = APIRouter()


class Membership_plans(BaseModel):
    membership_name: str
    membership_session_limit: int | None = None
    membership_duration: int
    membership_price: int




@router.get('/membership_plans/', tags=["membership_plans"])
def get_membership_plans(user=Depends(require_role("admin","client"))):
    """
    Function returns the membership plans fetched from the table.
    """

    print("Getting Membership Plans")
    
    query = "SELECT * FROM membership_plans"
    try:
        response = execute(query=query, fetch=True)
        return {"message": f"Membership Plans retrieved succesfully {response[0]}"}
    except Exception as e:
        return {"message": "Error {e} occured"}


@router.post('/membership_plans/', tags=["membership_plans"])
def post_membership_plans(plans:Membership_plans, user=Depends(require_role("admin"))):
    """
    Function to insert membership plans to the table.
    """

    print("Inserting into the table")

    query = """ INSERT INTO membership_plans 
    (name,duration_days,session_limit,price)
    VALUES (%s,%s,%s,%s)
    """

    try:
        response = execute(query=query, params=(plans.membership_name, plans.membership_duration, plans.membership_session_limit, plans.membership_price))
        return {"message": f"{plans.membership_name} plan added to the DataBase!",'id': response}
    except Exception as e:
        return(f"Error: Invalid input data. Details: {e}")