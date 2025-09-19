"""
Campus Event Manager Backend API
"""

from fastapi import FastAPI, HTTPException, Depends, File, UploadFile
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import bcrypt
import jwt
import os
import secrets

# Configuration
SECRET_KEY = "your-secret-key-change-in-production"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# In-memory storage (MongoDB optional)
class InMemoryDB:
    def __init__(self):
        self.users = []
        self.events = []

db = InMemoryDB()

# Pydantic Models
class UserBase(BaseModel):
    email: str
    name: str
    role: str = "user"

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    joined_date: datetime

class EventBase(BaseModel):
    title: str
    date: str
    time: str
    location: str
    category: str
    description: Optional[str] = ""

class EventCreate(EventBase):
    pass

class EventResponse(EventBase):
    id: str
    comments: List[Dict[str, Any]] = []

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class CommentCreate(BaseModel):
    text: str

# FastAPI app
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def create_access_token(data: dict):
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = data.copy()
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")

def verify_password(plain, hashed):
    return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# API Routes
users_db = {}
events_db = {}

@app.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    if any(u['email'] == user_data.email for u in db.users):
        raise HTTPException(status_code=400, detail="Email already registered")

    user = {
        "id": str(secrets.token_hex(8)),
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": get_password_hash(user_data.password),
        "role": user_data.role,
        "joined_date": datetime.utcnow()
    }
    db.users.append(user)

    access_token = create_access_token({"sub": user["email"]})
    user_response = UserResponse(**{k: v for k, v in user.items() if k != 'password_hash'})

    return Token(access_token=access_token, token_type="bearer", user=user_response)

@app.post("/auth/login", response_model=Token)
async def login(credentials: dict):
    user = next((u for u in db.users if u['email'] == credentials.get('email')), None)
    if not user or not verify_password(credentials.get('password'), user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token({"sub": user["email"]})
    user_response = UserResponse(**{k: v for k, v in user.items() if k != 'password_hash'})

    return Token(access_token=access_token, token_type="bearer", user=user_response)

@app.get("/events/", response_model=List[EventResponse])
async def get_events():
    return [EventResponse(**event) for event in db.events]

@app.post("/events/", response_model=EventResponse)
async def create_event(event_data: EventCreate):
    event = {
        "id": str(secrets.token_hex(8)),
        "title": event_data.title,
        "date": event_data.date,
        "time": event_data.time,
        "location": event_data.location,
        "category": event_data.category,
        "description": event_data.description,
        "comments": []
    }
    db.events.append(event)
    return EventResponse(**event)

@app.post("/events/{event_id}/comments")
async def add_comment(event_id: str, comment_data: CommentCreate):
    for event in db.events:
        if event['id'] == event_id:
            comment = {
                "id": str(secrets.token_hex(8)),
                "author": "Anonymous User",  # Would get from auth in real app
                "author_id": str(secrets.token_hex(8)),
                "text": comment_data.text,
                "timestamp": datetime.utcnow(),
                "timestamp_formatted": datetime.utcnow().strftime("%Y-%m-%d %H:%M")
            }
            event['comments'].append(comment)
            return {"message": "Comment added successfully", "comment": comment}
    raise HTTPException(status_code=404, detail="Event not found")
