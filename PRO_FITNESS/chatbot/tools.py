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
    """ Search for client membership with client firt_name, last_name, start_date, end_date and sessions remaining """

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
 """



model = init_chat_model(
    model="claude-sonnet-4-6",
    api_key=ANTHROPIC_API_KEY,
    max_tokens = 1000,
)


class ResponseFormat(BaseModel):
    """Response format for the agent """
    response: str


checkpointer = InMemorySaver()


TOOLS = [get_membership_plans, get_trainer, get_client_membership, get_user, get_client_sessions, signup_redirect]

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





