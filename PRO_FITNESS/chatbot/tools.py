import datetime
import time
from langchain.tools import tool, ToolRuntime
from langchain.agents import create_agent
from langchain.chat_models import init_chat_model
from langgraph.checkpoint.memory import InMemorySaver
from pydantic import BaseModel
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import execute
from dotenv import load_dotenv
load_dotenv()


ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')
user_id = 5



@tool('signup_redirect')
def signup_redirect() -> str:
    """Redirect user to signup form when they want to register for a membership plan"""
    return "You can sign up here: [Registration Form](http://localhost:8501/signup)"

@tool('get_all_users')
def get_user() -> str:
    """ Search for all the users in the database with first_name, last_name, role and id """
    response = execute(query="SELECT * FROM users", fetch=True)

    return str(response)


@tool('membership_plan_search')
def get_membership_plans() -> str:
    """
    Search for all the membership plans with pricing and session limit.
    """

    response = execute(query="SELECT * FROM membership_plans", fetch=True)

    return str(response)


@tool('trainer_search')
def get_trainer() -> str:
    """ Search for all the users with firstname and lastname where role is Trainer """
    response = execute(query="SELECT first_name, last_name FROM users WHERE role = %s", params=('trainer',), fetch=True)
    return str(response)


@tool('client_membership')
def get_client_membership() -> str:
    """ Search for client membership with client first_name, last_name, start_date, end_date and sessions remaining """

    query = """
        SELECT u.first_name, u.last_name, mp.name as plan_name, m.sessions_remaining, m.start_date, m.end_date
        FROM memberships m
        JOIN users u ON m.client_id = u.id
        JOIN membership_plans mp ON m.plan_id = mp.id
        WHERE m.client_id = %s
    """

    response = execute(query=query, params=(user_id,), fetch=True)

    return str(response)
    

@tool('client_sessions')
def get_client_sessions() -> str:
    """ Search for all the sessions for the client that are scheduled with first_name, last_name and the time it is scheduled_at where role is Trainer"""
        
    query = """ 
    SELECT u.first_name, u.last_name, s.scheduled_at 
    FROM sessions s
    JOIN users u ON s.trainer_id = u.id
    WHERE s.client_id = %s AND s.status = 'scheduled'
    """

    response = execute(query=query, params=(user_id,), fetch=True)
    return str(response)



user = execute(query="SELECT * FROM users WHERE id = %s", params=(user_id,), fetch=True)
user_name = user[0]['first_name']


SYSTEM_PROMPT = f""" 
You are a helpful assistant that can help with the gym application.
You are currently chatting with {user_name}.
You are given a query and you need to search the gym_application database for records matching the query.
You need to return the records in a formatted bulleted points.
You need to use the tools provided to you to search the database.
Only return what is retrieved and no other fluff.
You are very formal and do not use emojis.
Today's date is {datetime.date.today().strftime('%A, %B %d, %Y')}.
When a user mentions a day like "Tuesday" or "next Monday", calculate the next upcoming date for that day and use it. 
Never ask the user to provide a date in YYYY-MM-DD format.
 """



model = init_chat_model(
    model="claude-haiku-4-5-20251001",
    api_key=ANTHROPIC_API_KEY,
    max_tokens = 1000,
)

@tool('trainer_availability')
def get_availability(trainer_name: str) -> str:
    """
    Search for availability of the trainer given the name of the trainer with day_of_week, start_time and end_time
    """

    query = """SELECT u.first_name, ta.day_of_week, 
                    TIME_FORMAT(ta.start_time, '%h:%i %p') as start_time,
                    TIME_FORMAT(ta.end_time, '%h:%i %p') as end_time
               FROM trainer_availability ta
               JOIN users u ON ta.trainer_id = u.id
               WHERE u.first_name = %s
               """
    availability = execute(query=query, params=(trainer_name,), fetch=True)
    return str(availability)



# -------------------- POST TOOLS --------------------- #

@tool('create_booking')
def create_booking(trainer_name: str, session_date: str, time: str) -> str:
    """
    Book a session with a trainer. 
    session_date must be in YYYY-MM-DD format (e.g. 2026-04-01).
    session_time must be in HH:MM format (e.g. 10:00).
    """


    date_obj = datetime.datetime.strptime(session_date, "%Y-%m-%d")
    time_obj = datetime.datetime.strptime(time, "%H:%M").time()
    day_name = date_obj.strftime("%A").lower()


    print(f"Step 1: Looking up {trainer_name} on {day_name}")

    availability = execute(query="""SELECT u.first_name, ta.day_of_week, 
                    TIME_FORMAT(ta.start_time, '%H:%i') as start_time,
                    TIME_FORMAT(ta.end_time, '%H:%i') as end_time
               FROM trainer_availability ta
               JOIN users u ON ta.trainer_id = u.id
               WHERE u.first_name = %s 
                AND ta.day_of_week = %s""", params=(trainer_name, day_name, ), fetch=True)
    
    print(f"Availability: {availability}")

    if not availability:
        return f"{trainer_name} is not available on {day_name}s."
    
    # Step 2: Check if time is within their hour
    start = datetime.datetime.strptime(availability[0]["start_time"], '%H:%M').time()
    end = datetime.datetime.strptime(availability[0]['end_time'], '%H:%M').time()

    print(f"Step 2: Checking time {time_obj} between {start} and {end}")

    if not (start <= time_obj < end):
        return f"{trainer_name} is only available {availability[0]['start_time']} - {availability[0]['end_time']} on {day_name}s."

    
    trainer_session = execute(query="""SELECT s.scheduled_at
                                FROM sessions s
                                JOIN users u ON s.trainer_id = u.id
                                WHERE first_name = %s 
                                AND s.scheduled_at = %s AND s.status = 'scheduled'
                                """, params=(trainer_name,f"{session_date} {time}:00"), fetch=True)
    
    print(f"Step 3: Checking trainer conflicts")

    if trainer_session:
        return f"{trainer_name} is booked for that time slot!"

    user_enrollment = execute(query="""SELECT m.sessions_remaining, m.id
                                        FROM memberships m
                                        JOIN users u ON m.client_id = u.id
                                        WHERE u.id = %s AND m.status = 'active' AND m.sessions_remaining > 0""", params=(user_id,), fetch=True)

    print(f"Step 4: Checking membership")
    print(f"Enrollment: {user_enrollment}")

    if not user_enrollment:
        return f"You do not have a membership!"
    
    print(f"Step 5: Inserting session")

    trainer_id = execute(query="SELECT id from users WHERE first_name = %s", params=(trainer_name,), fetch=True)
    insert_session = """ INSERT INTO sessions (client_id,trainer_id,membership_id, scheduled_at, duration_min)
                        VALUES (%s, %s, %s, %s, %s) """

    try:
        response = execute(query=insert_session, params=(user_id, trainer_id[0]['id'], user_enrollment[0]['id'], f'{session_date} {time}:00', 60))
        if response:

            return f"Session Booked Succesfully {response[0]}"
    except Exception as e:
        return f'Exception {e} occured, Could not book a session'

    

    





class ResponseFormat(BaseModel):
    """Response format for the agent """
    response: str


checkpointer = InMemorySaver()


TOOLS = [get_membership_plans, get_trainer, get_client_membership, get_user, get_client_sessions, signup_redirect, get_availability, create_booking]

agent = create_agent(
    model=model,
    system_prompt = SYSTEM_PROMPT,
    tools = TOOLS,
    checkpointer = checkpointer,
)

config = {"configurable": {"thread_id": "1"}}



def response(input_text):
    response = agent.invoke(
        {"messages": [{"role": "user", "content":f"{input_text}"}]},
        config = config,
    )

    return response['messages'][-1].content





