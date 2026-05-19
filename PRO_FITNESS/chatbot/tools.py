import datetime
import time
from fastapi import params
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


_current_user_id = None
_current_role = None



def set_user(uid, role):
    global _current_user_id
    global _current_role
    _current_user_id = uid
    _current_role = role


def next_weekday(day_name):
    days = {'monday':0,'tuesday':1,'wednesday':2,'thursday':3,'friday':4,'saturday':5,'sunday':6}
    today = datetime.date.today()
    target = days[day_name.lower()]
    diff = (target - today.weekday()) % 7
    if diff == 0:
        diff = 7
    return today + datetime.timedelta(days=diff)



@tool('signup_redirect')
def signup_redirect() -> str:
    """Redirect user to signup form when they want to register for a membership plan"""
    return "You can sign up here: [Registration Form](http://localhost:8501/signup)"

@tool('get_all_users')
def get_user() -> str:
    """ Search for all the users in the database with first_name, last_name, role and id (admin only) """
    if _current_role != "admin":
        return "Access denied. Only admins can view all users."
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

    response = execute(query=query, params=(_current_user_id,), fetch=True)

    return str(response)
    

@tool('client_sessions')
def get_client_sessions() -> str:
    """ Search for all the sessions for the client that are scheduled with first_name, last_name and the time it is scheduled_at where role is Trainer"""

    query = """ 
    SELECT s.id, u.first_name, u.last_name, s.scheduled_at 
    FROM sessions s
    JOIN users u ON s.trainer_id = u.id
    WHERE s.client_id = %s AND s.status = 'scheduled'
    """

    response = execute(query=query, params=(_current_user_id,), fetch=True)
    return str(response)





model = init_chat_model(
    model="claude-haiku-4-5-20251001",
    api_key=ANTHROPIC_API_KEY,
    max_tokens = 1000,
)

@tool('trainer_availability')
def get_availability(trainer_name: str) -> str:
    """
    Search for availability of the trainer given the name of the trainer with day_of_week, start_time and end_time. Format the response in a readable format
    """
    print(f"Looking up trainer: '{trainer_name}'")
    query = """SELECT u.first_name, ta.day_of_week, 
                    TIME_FORMAT(ta.start_time, '%h:%i %p') as start_time,
                    TIME_FORMAT(ta.end_time, '%h:%i %p') as end_time
               FROM trainer_availability ta
               JOIN users u ON ta.trainer_id = u.id
               WHERE CONCAT(u.first_name, ' ', u.last_name) = %s
               """
    availability = execute(query=query, params=(trainer_name,), fetch=True)
    return str(availability)



# -------------------- POST TOOLS --------------------- #

@tool('create_booking')
def create_booking(trainer_name: str, day: str, time: str) -> str:
    """
    Book a session with a trainer.
    You will be provided a day.
    session_time must be in HH:MM format (e.g. 10:00).
    Stop after returning the response. Do not ask the user to confirm the booking.
    """


    session_date = next_weekday(day)
    time_obj = datetime.datetime.strptime(time, "%H:%M").time()
    day_name = day.lower()


    print(f"Step 1: Looking up {trainer_name} on {day_name}")

    availability = execute(query="""SELECT u.first_name, ta.day_of_week, 
                    TIME_FORMAT(ta.start_time, '%H:%i') as start_time,
                    TIME_FORMAT(ta.end_time, '%H:%i') as end_time
               FROM trainer_availability ta
               JOIN users u ON ta.trainer_id = u.id
               WHERE CONCAT(u.first_name, ' ', u.last_name ) = %s 
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
                                        WHERE u.id = %s AND m.status = 'active' AND m.sessions_remaining > 0""", params=(_current_user_id,), fetch=True)

    print(f"Step 4: Checking membership")
    print(f"Enrollment: {user_enrollment}")

    if not user_enrollment:
        return f"You do not have a membership!"
    
    print(f"Step 5: Inserting session")

    trainer_id = execute(query="SELECT id from users WHERE CONCAT(first_name, ' ', last_name) = %s", params=(trainer_name,), fetch=True)
    insert_session = """ INSERT INTO sessions (client_id,trainer_id,membership_id, scheduled_at, duration_min)
                        VALUES (%s, %s, %s, %s, %s) """

    print(f"Trainer ID result: {trainer_id}")
    print(f"User enrollment result: {user_enrollment}")

    try:
        response = execute(query=insert_session, params=(_current_user_id, trainer_id[0]['id'], user_enrollment[0]['id'], f'{session_date} {time}:00', 60))
        if response:
            return "Session Booked Succesfully"
    except Exception as e:
        print(f'Exception {e} occured, Could not book a session')
        return "Could not book a session"



@tool('cancel_booking')
def cancel_booking(session_id: int) -> str:
    """Cancel a session by its ID. Use get_client_sessions to find the session ID first."""
    
    session = execute(
        "SELECT id, membership_id FROM sessions WHERE id = %s AND client_id = %s AND status = 'scheduled'",
        (session_id, _current_user_id), fetch=True
    )
    if not session:
        return "Session not found or already cancelled."
    
    execute("UPDATE sessions SET status = 'cancelled' WHERE id = %s", (session[0]['id'],))
    
    execute(
        "UPDATE memberships SET sessions_remaining = sessions_remaining + 1 WHERE id = %s AND sessions_remaining IS NOT NULL",
        (session[0]['membership_id'],)
    )
    
    return f"Session cancelled successfully. Session refunded to your membership."


checkpointer = InMemorySaver()


PUBLIC_TOOLS = [get_membership_plans, get_trainer, get_availability, signup_redirect]

CLIENT_TOOLS = [get_membership_plans, get_trainer, get_availability, get_client_membership, get_client_sessions, create_booking, cancel_booking, signup_redirect]

ADMIN_TOOLS = [get_membership_plans, get_trainer, get_availability, get_client_membership, get_client_sessions, create_booking, cancel_booking, get_user, signup_redirect]

TRAINER_TOOLS = [get_client_sessions, get_availability]





def response(input_text, user_id=None, user_role=None):
    set_user(user_id, user_role)
    today = datetime.date.today().strftime('%A, %B %d, %Y')

    if user_role == "admin":
        tools = ADMIN_TOOLS
        role_context = "You are speaking with an admin. You can access all system data."
    elif user_role == "client":
        tools = CLIENT_TOOLS
        role_context = "You are speaking with a client. Only show their own data."
    elif user_role == "trainer":
        tools = TRAINER_TOOLS
        role_context = "You are speaking with a trainer. Only show their own sessions."
    else:
        tools = PUBLIC_TOOLS
        role_context = "You are speaking with a visitor. Share only general gym info and encourage sign up."

    if user_id:
        user = execute("SELECT * FROM users WHERE id = %s", (user_id,), fetch=True)
        user_name = user[0]['first_name']
    else:
        user_name = "Guest"

    system_prompt = f"""
You are FitAssist, a helpful assistant for Haachiko Fitness.
You are currently chatting with {user_name}.
Today's date is {today}.
{role_context}
Be formal and concise. Return info in clean bullet points. No emojis.
When a user mentions a day like "Monday", calculate the next upcoming date.
Always pass dates to tools in YYYY-MM-DD HH:MM:SS format.
When a user cancels a session without specifying time, assume 10:00 AM.
"""

    agent = create_agent(
        model=model,
        system_prompt=system_prompt,
        tools=tools,
        checkpointer=checkpointer,
    )

    config = {"configurable": {"thread_id": str(user_id or "guest")}}

    result = agent.invoke(
        {"messages": [{"role": "user", "content": input_text}]},
        config=config,
    )

    booking_confirmed = any(
        getattr(m, 'name', None) == 'create_booking'
        and 'Booked' in str(getattr(m, 'content', ''))
        for m in result['messages']
    )

    cancel_confirmed = any(
        getattr(m, 'name', None) == 'cancel_booking'
        and 'cancelled' in str(getattr(m, 'content', '')).lower()
        for m in result['messages']
    )

    return {
        'text': result['messages'][-1].content,
        'booking_confirmed': booking_confirmed,
        'booking_cancelled': cancel_confirmed,
    }