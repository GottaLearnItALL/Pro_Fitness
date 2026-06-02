from fastapi import APIRouter
from db import execute
from pydantic import BaseModel
from datetime import date, time
from routes.auth_dependency import require_role
from fastapi import Depends
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class Trainer_availabilty(BaseModel):
    trainer_id: int
    day_of_week: str
    start_time: time
    end_time: time




@router.get('/trainer_availability/', tags=['trainer_availability'])
def get_trainer_availability(user=Depends(require_role("admin","trainer"))):
    query = """SELECT trainer_id, day_of_week, 
               TIME_FORMAT(start_time, '%h:%i %p') as start_time,
               TIME_FORMAT(end_time, '%h:%i %p') as end_time
               FROM trainer_availability"""
    logger.info("Fetching trainer availability")
    try:
        response = execute(query=query, fetch=True)
        logger.info(f"Fetched {len(response or [])} availability records")
        return {'message': 'Trainer availability fetched successfully', 'Data': response or []}
    except Exception as e:
        logger.error(f"Error fetching trainer availability: {e}")



@router.post('/trainer_availability/', tags=['trainer_availability'])
def add_trainer_availability(trainer: Trainer_availabilty, user=Depends(require_role("admin","trainer"))):
    logger.info(f"Adding availability for trainer_id={trainer.trainer_id} day={trainer.day_of_week}")

    query = "INSERT INTO trainer_availability (trainer_id, day_of_week, start_time, end_time) VALUES (%s,%s,%s,%s)"

    try:
        response = execute(query=query, params=(trainer.trainer_id, trainer.day_of_week, trainer.start_time, trainer.end_time))
        if response:
            logger.info(f"Trainer availability added id={response} for trainer_id={trainer.trainer_id}")
            return {'message': f'Added trainer availability on {trainer.day_of_week} from {trainer.start_time} to{trainer.end_time}','id': response}
    except Exception as e:
        logger.error(f"Error adding trainer availability: {e}")






