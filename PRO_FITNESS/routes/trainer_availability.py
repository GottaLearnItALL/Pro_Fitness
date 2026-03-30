from fastapi import APIRouter
from db import execute
from pydantic import BaseModel
from datetime import date, time


router = APIRouter()


class Trainer_availabilty(BaseModel):
    trainer_id: int
    day_of_week: str
    start_time: time
    end_time: time




@router.get('/trainer_availability/', tags=['trainer_availability'])
def get_trainer_availability():
    query = """SELECT trainer_id, day_of_week, 
               TIME_FORMAT(start_time, '%h:%i %p') as start_time,
               TIME_FORMAT(end_time, '%h:%i %p') as end_time
               FROM trainer_availability"""
    try:
        response = execute(query=query, fetch=True)
        return {'message': 'Trainer availability fetched successfully', 'Data': response or []}
    except Exception as e:
        print(f"Exception {e} occured")



@router.post('/trainer_availability/', tags=['trainer_availability'])
def add_trainer_availability(trainer: Trainer_availabilty):
    print("Entering post request")

    query = "INSERT INTO trainer_availability (trainer_id, day_of_week, start_time, end_time) VALUES (%s,%s,%s,%s)"

    try:
        response = execute(query=query, params=(trainer.trainer_id, trainer.day_of_week, trainer.start_time, trainer.end_time))
        if response:
            print(f"Trainer Availability added succesfully")
            return {'message': f'Added trainer availability on {trainer.day_of_week} from {trainer.start_time} to{trainer.end_time}','id': response}
    except Exception as e:
        print(f'Error {e} occured!.')




