from fastapi import APIRouter
from fastapi import Depends
from routes.auth_dependency import get_current_user
from pydantic import BaseModel


router = APIRouter()

class ChatMessage(BaseModel):
    content: str


@router.post('/chat', tags=['chat'])
def chat(message: ChatMessage, user=Depends(get_current_user)):
    print(message)
    from chatbot.tools import response
    result = response(message.content, user['user_id'], user['role'])
    return {
        "reply": result['text'],
        "booking_confirmed": result['booking_confirmed'],
    }