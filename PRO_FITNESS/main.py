from fastapi import FastAPI
from routes import users

app = FastAPI()


app.include_router(
    users.router,
    prefix='/api',
    tags=['users']
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the main app"}






