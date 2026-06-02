from fastapi import APIRouter
from db import execute
from pydantic import BaseModel
from routes.auth_dependency import require_role
from fastapi import Depends
import logging

logger = logging.getLogger(__name__)


router = APIRouter()


class Membership_plans(BaseModel):
    membership_name: str
    membership_session_limit: int | None = None
    membership_duration: int
    membership_price: int




@router.get('/membership_plans/', tags=["membership_plans"])
def get_membership_plans():
    """Public — used on landing page before login."""
    logger.info("Fetching membership plans")
    query = "SELECT * FROM membership_plans"
    try:
        response = execute(query=query, fetch=True)
        logger.info(f"Fetched {len(response)} membership plans")
        return {"message": "Membership Plans retrieved successfully", "Data": response}
    except Exception as e:
        logger.error(f"Error fetching membership plans: {e}")
        return {"message": f"Error {e} occurred", "Data": []}


@router.post('/membership_plans/', tags=["membership_plans"])
def post_membership_plans(plans:Membership_plans, user=Depends(require_role("admin"))):
    """
    Function to insert membership plans to the table.
    """

    logger.info(f"Creating membership plan: {plans.membership_name}")

    query = """ INSERT INTO membership_plans
    (name,duration_days,session_limit,price)
    VALUES (%s,%s,%s,%s)
    """

    try:
        response = execute(query=query, params=(plans.membership_name, plans.membership_duration, plans.membership_session_limit, plans.membership_price))
        logger.info(f"Membership plan created id={response} name={plans.membership_name}")
        return {"message": f"{plans.membership_name} plan added to the DataBase!",'id': response}
    except Exception as e:
        logger.error(f"Error creating membership plan: {e}")
        return(f"Error: Invalid input data. Details: {e}")