from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from routes import auth, users, scans, consultations, chatbot, admin, cattle

app = FastAPI(title="VetriScan AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,          prefix="/api/auth",          tags=["Auth"])
app.include_router(users.router,         prefix="/api/users",         tags=["Users"])
app.include_router(scans.router,         prefix="/api/scans",         tags=["Scans"])
app.include_router(consultations.router, prefix="/api/consultations", tags=["Consultations"])
app.include_router(chatbot.router,       prefix="/api/chatbot",       tags=["Chatbot"])
app.include_router(admin.router,         prefix="/api/admin",         tags=["Admin"])
app.include_router(cattle.router,        prefix="/api/cattle",        tags=["Cattle"])

@app.get("/")
def root():
    return {"message": "VetriScan AI API is running"}
