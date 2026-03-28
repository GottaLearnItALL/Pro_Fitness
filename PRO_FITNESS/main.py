from fastapi import FastAPI
from routes import users, membership, user_membership, sessions, attendance, trainer_availability

app = FastAPI()


app.include_router(
    users.router,
    prefix='/api',
    tags=['users']
)


app.include_router(
    membership.router,
    prefix='/api',
    tags=['membership_plans']
)

app.include_router(
    user_membership.router,
    prefix='/api',
    tags=['user_membership']
)

app.include_router(
    sessions.router,
    prefix='/api',
    tags=['sessions']
)

app.include_router(
    attendance.router,
    prefix='/api',
    tags=['attendance']
)


app.include_router(
    trainer_availability.router,
    prefix='/api',
    tags=['trainer_availability']
)



@app.get("/")
def read_root():
    return {"message": "Welcome to the main app"}






