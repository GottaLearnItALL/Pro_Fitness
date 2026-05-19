from fastapi import APIRouter
from fastapi import Depends
from routes.auth_dependency import get_optional_user
from pydantic import BaseModel
from chatbot.tools import response

router = APIRouter()

class ChatMessage(BaseModel):
    content: str


@router.post('/chat')
def chat(message: ChatMessage, user=Depends(get_optional_user)):
    user_id = user['user_id'] if user else None
    user_role = user['role'] if user else None
    reply = response(message.content, user_id, user_role)    
    return {
        "reply": reply['text'],
        "booking_confirmed": reply['booking_confirmed'],
        "booking_cancelled": reply['booking_cancelled']
    }



