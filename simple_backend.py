"""
Simple Campus Event Manager Backend
====================================

Works with in-memory storage (no MongoDB required)
Complete API for full-stack event management
"""

from fastapi import FastAPI, HTTPException, Depends, File, UploadFile
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

import jwt
import os
# import motor.motor_asyncio  # Optional - uncomment for MongoDB
# Configuration
SECRET_KEY = "test-secret-key"
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# In-memory storage
users_db = {}
events_db = {}
next_user_id = 1
next_event_id = 1

# FastAPI app
app = FastAPI(title="Event Manager API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")
import hashlib

# Helper functions
def get_password_hash(password: str) -> str:
    # Simple SHA256 hashing for demo purposes
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Simple verification for demo purposes
    return hashlib.sha256(plain_password.encode()).hexdigest() == hashed_password

def create_access_token(data: dict):
    to_encode = data.copy()
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def initialize_sample_data():
    """Initialize sample data on startup if not already done"""
    global users_db, events_db, next_user_id, next_event_id

    if users_db:
        return  # Already initialized

    # Create sample users
    sample_users = [
        {
            "id": "1",
            "email": "john@university.edu",
            "name": "John Smith",
            "role": "organizer",
            "password_hash": get_password_hash("password123"),
            "joined_date": datetime.now().isoformat(),
            "points": 150,
            "verified": True
        },
        {
            "id": "2",
            "email": "sarah@university.edu",
            "name": "Sarah Johnson",
            "role": "student",
            "password_hash": get_password_hash("password123"),
            "joined_date": datetime.now().isoformat(),
            "points": 200,
            "verified": True
        },
        {
            "id": "3",
            "email": "mike@university.edu",
            "name": "Mike Chen",
            "role": "student",
            "password_hash": get_password_hash("password123"),
            "joined_date": datetime.now().isoformat(),
            "points": 180,
            "verified": True
        },
        {
            "id": "4",
            "email": "emma@university.edu",
            "name": "Emma Davis",
            "role": "faculty",
            "password_hash": get_password_hash("password123"),
            "joined_date": datetime.now().isoformat(),
            "points": 220,
            "verified": True
        }
    ]

    # Add users to database
    for user in sample_users:
        users_db[user["id"]] = user

    # Create sample events
    now = datetime.now()
    sample_events = [
        {
            "id": "1",
            "title": "Spring Music Festival 2025",
            "date": "2025-03-25",
            "time": "14:00",
            "location": "Main Hall",
            "category": "cultural",
            "description": "Annual celebration featuring local bands, food trucks, and campus talent. Join us for an unforgettable afternoon of music and entertainment!",
            "created_by": "1",
            "created_at": now.isoformat(),
            "attendees": ["2", "3", "4"],
            "comments": [
                {
                    "author": "Sarah Johnson",
                    "text": "I'm so excited to perform with my band!",
                    "timestamp": now.isoformat()
                },
                {
                    "author": "Mike Chen",
                    "text": "Are there any food vendor applications still open?",
                    "timestamp": now.isoformat()
                }
            ]
        },
        {
            "id": "2",
            "title": "Tech Innovation Expo",
            "date": "2025-03-18",
            "time": "10:00",
            "location": "Innovation Lab",
            "category": "academic",
            "description": "Showcase groundbreaking student projects and research initiatives. Network with industry leaders and fellow innovators.",
            "created_by": "3",
            "created_at": now.isoformat(),
            "attendees": ["1", "2", "4"],
            "comments": [
                {
                    "author": "Mike Chen",
                    "text": "I'll be demoing my AI project!",
                    "timestamp": now.isoformat()
                }
            ]
        },
        {
            "id": "3",
            "title": "Community Bake Sale",
            "date": "2025-04-02",
            "time": "11:00",
            "location": "Student Plaza",
            "category": "social",
            "description": "Raising funds for local charities with homemade treats and community spirit. All proceeds go to helping local shelters.",
            "created_by": "2",
            "created_at": now.isoformat(),
            "attendees": ["1", "4"],
            "comments": []
        }
    ]

    # Add events to database
    for event in sample_events:
        events_db[event["id"]] = event

    # Set next IDs
    next_user_id = len(sample_users) + 1
    next_event_id = len(sample_events) + 1

# Models
class UserBase(BaseModel):
    email: str
    name: str
    role: str = "user"

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    joined_date: str
    points: int = 0

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
    created_by: str
    created_at: str
    attendees: List[str] = []
    comments: List[Dict[str, Any]] = []

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str
    role: str = "student"

class ForgotPasswordRequest(BaseModel):
    email: str

class EventUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    location: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str



# Authentication Routes
@app.post("/auth/login")
async def login(request: LoginRequest):
    """Login user"""
    email = request.email
    password = request.password

    # Find user by email
    user = None
    user_id = None
    for uid, user_data in users_db.items():
        if user_data["email"] == email:
            user = user_data
            user_id = uid
            break

    if not user or not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Create access token
    access_token = create_access_token(data={"sub": email, "user_id": user_id})

    user_response = UserResponse(
        id=user_id,
        email=user["email"],
        name=user["name"],
        role=user["role"],
        joined_date=user["joined_date"],
        points=user["points"]
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response.dict()
    }

@app.post("/auth/register")
async def register(request: RegisterRequest):
    """Register new user"""
    # Check if email already exists
    for user_data in users_db.values():
        if user_data["email"] == request.email:
            raise HTTPException(status_code=400, detail="Email already registered")

    global next_user_id
    user_id = str(next_user_id)
    next_user_id += 1

    # Create user
    users_db[user_id] = {
        "id": user_id,
        "email": request.email,
        "name": f"{request.first_name} {request.last_name}",
        "role": request.role,
        "password_hash": get_password_hash(request.password),
        "joined_date": datetime.now().isoformat(),
        "points": 100,
        "verified": False
    }

    # Create access token
    access_token = create_access_token(data={"sub": request.email, "user_id": user_id})

    user_response = UserResponse(
        id=user_id,
        email=request.email,
        name=f"{request.first_name} {request.last_name}",
        role=request.role,
        joined_date=users_db[user_id]["joined_date"],
        points=users_db[user_id]["points"]
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response.dict(),
        "message": "Account created successfully! Please verify your email."
    }

@app.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Forgot password - send reset link"""
    # Find user by email
    user_found = False
    for user_data in users_db.values():
        if user_data["email"] == request.email:
            user_found = True
            break

    # Always return success for security (don't reveal if email exists)
    return {
        "message": "If an account with that email exists, we've sent a password reset link.",
        "success":True
    }

@app.post("/auth/social/google")
async def login_with_google(credentials: dict):
    """Google OAuth login (mock implementation)"""
    # Mock Google login - create user if doesn't exist
    email = credentials.get("email", "google_user@example.com")

    # Find or create user
    user_id = None
    for uid, user_data in users_db.items():
        if user_data["email"] == email:
            user_id = uid
            break

    if not user_id:
        global next_user_id
        user_id = str(next_user_id)
        next_user_id += 1
        users_db[user_id] = {
            "id": user_id,
            "email": email,
            "name": credentials.get("name", "Google User"),
            "role": "student",
            "password_hash": "",  # Social login
            "joined_date": datetime.now().isoformat(),
            "points": 100,
            "verified": True
        }

    access_token = create_access_token(data={"sub": email, "user_id": user_id})
    user = users_db[user_id]
    user_response = UserResponse(
        id=user_id,
        email=user["email"],
        name=user["name"],
        role=user["role"],
        joined_date=user["joined_date"],
        points=user["points"]
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response.dict(),
        "message": "Logged in with Google successfully!"
    }

@app.post("/auth/social/facebook")
async def login_with_facebook(credentials: dict):
    """Facebook OAuth login (mock implementation)"""
    email = credentials.get("email", "facebook_user@example.com")

    user_id = None
    for uid, user_data in users_db.items():
        if user_data["email"] == email:
            user_id = uid
            break

    if not user_id:
        global next_user_id
        user_id = str(next_user_id)
        next_user_id += 1
        users_db[user_id] = {
            "id": user_id,
            "email": email,
            "name": credentials.get("name", "Facebook User"),
            "role": "student",
            "password_hash": "",
            "joined_date": datetime.now().isoformat(),
            "points": 100,
            "verified": True
        }

    access_token = create_access_token(data={"sub": email, "user_id": user_id})
    user = users_db[user_id]
    user_response = UserResponse(
        id=user_id,
        email=user["email"],
        name=user["name"],
        role=user["role"],
        joined_date=user["joined_date"],
        points=user["points"]
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response.dict(),
        "message": "Logged in with Facebook successfully!"
    }

@app.get("/events/", response_model=List[EventResponse])
async def get_events():
    """Get all events"""
    return list(events_db.values())

@app.post("/events/", response_model=EventResponse)
async def create_event(event: EventCreate):
    """Create new event"""
    global next_event_id
    event_id = str(next_event_id)
    next_event_id += 1

    # For demo purposes, set created_by to current user ID (would get from JWT token in production)
    # In production, decode JWT token to get user_id
    current_user_id = "1"  # Mock: would be extracted from Authorization Bearer token

    event_data = event.dict()
    event_data.update({
        "id": event_id,
        "created_by": current_user_id,
        "created_at": datetime.now().isoformat(),
        "attendees": [],
        "comments": []
    })

    events_db[event_id] = event_data
    return EventResponse(**event_data)

@app.get("/events/{event_id}")
async def get_event(event_id: str):
    """Get single event by ID"""
    if event_id not in events_db:
        raise HTTPException(status_code=404, detail="Event not found")
    return EventResponse(**events_db[event_id])

@app.put("/events/{event_id}")
async def update_event(event_id: str, event_update: EventUpdate):
    """Update event"""
    if event_id not in events_db:
        raise HTTPException(status_code=404, detail="Event not found")

    # Update only provided fields
    for field, value in event_update.dict(exclude_unset=True).items():
        if value is not None:
            events_db[event_id][field] = value

    events_db[event_id]["updated_at"] = datetime.now().isoformat()
    return EventResponse(**events_db[event_id])

@app.delete("/events/{event_id}")
async def delete_event(event_id: str):
    """Delete event"""
    if event_id not in events_db:
        raise HTTPException(status_code=404, detail="Event not found")

    deleted_event = events_db.pop(event_id)
    return {"message": "Event deleted successfully", "event": deleted_event}

@app.post("/events/{event_id}/comments")
async def add_comment(event_id: str, comment: dict):
    """Add comment to event"""
    if event_id not in events_db:
        raise HTTPException(status_code=404, detail="Event not found")

    new_comment = {
        "author": "Anonymous",
        "text": comment.get("text", ""),
        "timestamp": datetime.now().isoformat()
    }

    events_db[event_id]["comments"].append(new_comment)
    return {"message": "Comment added"}

@app.post("/events/{event_id}/attend")
async def attend_event(event_id: str, user_data: dict = None):
    """Attend or unattend an event"""
    if event_id not in events_db:
        raise HTTPException(status_code=404, detail="Event not found")

    # Mock user ID - in real app would get from JWT token
    user_id = user_data.get("user_id", "user1") if user_data else "user1"

    attendees = events_db[event_id]["attendees"]
    if user_id in attendees:
        attendees.remove(user_id)
        action = "unattended"
    else:
        attendees.append(user_id)
        action = "attended"

    return {
        "message": f"Successfully {action} event",
        "attendees_count": len(attendees),
        "attended": action == "attended"
    }

# Profile Management
@app.get("/profile")
async def get_profile():
    """Get current user profile"""
    # Mock user profile - in real app would get from JWT token
    user_id = "1"  # Would get from token
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User not found")

    user = users_db[user_id]
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "joined_date": user["joined_date"],
        "points": user["points"],
        "verified": user.get("verified", False)
    }

@app.put("/profile")
async def update_profile(profile_update: ProfileUpdateRequest):
    """Update user profile"""
    # Mock user profile update - in real app would get from JWT token
    user_id = "1"  # Would get from token
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User not found")

    user = users_db[user_id]

    # Check if email is being changed and if it's already taken
    if profile_update.email and profile_update.email != user["email"]:
        for uid, u in users_db.items():
            if uid != user_id and u["email"] == profile_update.email:
                raise HTTPException(status_code=400, detail="Email already registered")

    # Update fields
    if profile_update.name:
        user["name"] = profile_update.name
    if profile_update.email:
        user["email"] = profile_update.email

    user["updated_at"] = datetime.now().isoformat()

    return {
        "message": "Profile updated successfully",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "joined_date": user["joined_date"],
            "points": user["points"],
            "verified": user.get("verified", False)
        }
    }

@app.put("/auth/change-password")
async def change_password(password_change: ChangePasswordRequest):
    """Change user password"""
    # Mock user - in real app would get from JWT token
    user_id = "1"  # Would get from token
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User not found")

    user = users_db[user_id]

    # Verify current password
    if not verify_password(password_change.current_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    # Update password
    user["password_hash"] = get_password_hash(password_change.new_password)
    user["updated_at"] = datetime.now().isoformat()

    return {"message": "Password changed successfully"}

# File Upload
@app.post("/upload/file")
async def upload_file(file: UploadFile = File(...)):
    """Upload file (image, document, etc.)"""
    try:
        # Generate unique filename
        file_extension = file.filename.split(".")[-1] if "." in file.filename else ""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{file.filename}"

        file_path = os.path.join(UPLOAD_DIR, filename)

        # Save file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        # Return file info
        return {
            "filename": filename,
            "original_filename": file.filename,
            "size": len(content),
            "content_type": file.content_type,
            "url": f"/uploads/{filename}"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# Notifications
@app.get("/notifications")
async def get_notifications():
    """Get user notifications"""
    # Mock notifications - in real app would get from database
    notifications = [
        {
            "id": "1",
            "type": "event_reminder",
            "title": "Event Reminder",
            "message": "Don't forget about the Welcome Event tomorrow!",
            "timestamp": datetime.now().isoformat(),
            "read": False
        },
        {
            "id": "2",
            "type": "achievement",
            "title": "Achievement Unlocked!",
            "message": "Congratulations! You earned 'First Steps' badge",
            "timestamp": (datetime.now() - timedelta(hours=1)).isoformat(),
            "read": True
        }
    ]

    return {
        "notifications": notifications,
        "unread_count": sum(1 for n in notifications if not n["read"])
    }

@app.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    """Mark notification as read"""
    # Mock acknowledgment - in real app would update database
    return {"message": "Notification marked as read", "notification_id": notification_id}

# Favorites System
favorites_db = {}

@app.post("/favorites/{event_id}")
async def add_to_favorites(event_id: str):
    """Add event to favorites"""
    if event_id not in events_db:
        raise HTTPException(status_code=404, detail="Event not found")

    user_id = "1"  # Would get from JWT token
    if user_id not in favorites_db:
        favorites_db[user_id] = []

    if event_id not in favorites_db[user_id]:
        favorites_db[user_id].append(event_id)

    return {"message": "Added to favorites", "favorites": favorites_db[user_id]}

@app.delete("/favorites/{event_id}")
async def remove_from_favorites(event_id: str):
    """Remove event from favorites"""
    user_id = "1"  # Would get from JWT token
    if user_id in favorites_db and event_id in favorites_db[user_id]:
        favorites_db[user_id].remove(event_id)

    return {"message": "Removed from favorites", "favorites": favorites_db.get(user_id, [])}

@app.get("/favorites")
async def get_favorites():
    """Get user's favorite events"""
    user_id = "1"  # Would get from JWT token
    user_favorites = favorites_db.get(user_id, [])

    favorite_events = []
    for event_id in user_favorites:
        if event_id in events_db:
            favorite_events.append(EventResponse(**events_db[event_id]))

    return {"favorites": favorite_events}

# Advanced Dashboard and Analytics
@app.get("/analytics/events")
async def get_event_analytics(time_range: str = "month"):
    """Get detailed event analytics"""
    # Mock analytics data
    analytics = {
        "total_events": len(events_db),
        "events_this_month": len([e for e in events_db.values() if e["date"].startswith("2025-")]),
        "popular_category": "social",
        "attendance_trend": [5, 8, 12, 15, 20, 25, 30],
        "category_breakdown": {
            "academic": 10,
            "sports": 15,
            "cultural": 8,
            "social": 22
        }
    }

    return analytics

@app.get("/analytics/users")
async def get_user_analytics():
    """Get user analytics"""
    # Mock user analytics
    analytics = {
        "total_users": len(users_db),
        "active_users": 45,
        "new_this_month": 8,
        "engagement_rate": 78.5,
        "role_distribution": {
            "student": 85,
            "organizer": 10,
            "faculty": 3,
            "admin": 2
        }
    }

    return analytics

@app.get("/dashboard")
async def get_dashboard():
    """Get dashboard stats"""
    total_events = len(events_db)
    upcoming = sum(1 for e in events_db.values() if e["date"] >= datetime.now().strftime("%Y-%m-%d"))
    return {
        "totalEvents": total_events,
        "upcomingEvents": upcoming,
        "myEvents": 1,  # Mock
        "averageRating": 4.0,
        "totalAttendees": 10,
        "totalComments": 5
    }

@app.get("/gamification/stats")
async def get_gamification_stats():
    """Get gamification stats (mock)"""
    return {
        "points": 150,
        "level": 1,
        "achievements": ["account_created"],
        "streak": 3
    }

# Initialize sample data
@app.post("/admin/init-sample-data")
async def init_sample_data():
    """Initialize rich sample data for the event management system"""
    global events_db, users_db, next_user_id, next_event_id

    # Reset counters
    next_event_id = 1

    # Create sample users
    sample_users = [
        {
            "id": "1",
            "email": "john@university.edu",
            "name": "John Smith",
            "role": "organizer",
            "password_hash": get_password_hash("password123"),
            "joined_date": datetime.now().isoformat(),
            "points": 150,
            "verified": True
        },
        {
            "id": "2",
            "email": "sarah@university.edu",
            "name": "Sarah Johnson",
            "role": "student",
            "password_hash": get_password_hash("password123"),
            "joined_date": datetime.now().isoformat(),
            "points": 200,
            "verified": True
        },
        {
            "id": "3",
            "email": "mike@university.edu",
            "name": "Mike Chen",
            "role": "student",
            "password_hash": get_password_hash("password123"),
            "joined_date": datetime.now().isoformat(),
            "points": 180,
            "verified": True
        },
        {
            "id": "4",
            "email": "emma@university.edu",
            "name": "Emma Davis",
            "role": "faculty",
            "password_hash": get_password_hash("password123"),
            "joined_date": datetime.now().isoformat(),
            "points": 220,
            "verified": True
        }
    ]

    # Add users to database
    for user in sample_users:
        users_db[user["id"]] = user

    # Create sample events with past, current, and future dates
    now = datetime.now()
    sample_events = [
        {
            "id": "1",
            "title": "Spring Music Festival 2025",
            "date": "2025-03-25",
            "time": "14:00",
            "location": "Main Hall",
            "category": "cultural",
            "description": "Annual celebration featuring local bands, food trucks, and campus talent. Join us for an unforgettable afternoon of music and entertainment!",
            "created_by": "1",
            "created_at": now.isoformat(),
            "attendees": ["2", "3", "4"],
            "comments": [
                {
                    "author": "Sarah Johnson",
                    "text": "I'm so excited to perform with my band!",
                    "timestamp": now.isoformat()
                },
                {
                    "author": "Mike Chen",
                    "text": "Are there any food vendor applications still open?",
                    "timestamp": now.isoformat()
                }
            ]
        },
        {
            "id": "2",
            "title": "Tech Innovation Expo",
            "date": "2025-03-18",
            "time": "10:00",
            "location": "Innovation Lab",
            "category": "academic",
            "description": "Showcase groundbreaking student projects and research initiatives. Network with industry leaders and fellow innovators.",
            "created_by": "3",
            "created_at": now.isoformat(),
            "attendees": ["1", "2", "4"],
            "comments": [
                {
                    "author": "Mike Chen",
                    "text": "I'll be demoing my AI project!",
                    "timestamp": now.isoformat()
                }
            ]
        },
        {
            "id": "3",
            "title": "Community Bake Sale",
            "date": "2025-04-02",
            "time": "11:00",
            "location": "Student Plaza",
            "category": "social",
            "description": "Raising funds for local charities with homemade treats and community spirit. All proceeds go to helping local shelters.",
            "created_by": "2",
            "created_at": now.isoformat(),
            "attendees": ["1", "4"],
            "comments": []
        }
    ]

    # Add events to database
    for event in sample_events:
        events_db[event["id"]] = event

    # Set next IDs
    next_user_id = len(sample_users) + 1
    next_event_id = len(sample_events) + 1

    return {
        "message": f"Initialized with {len(sample_users)} users and {len(sample_events)} events",
        "users_created": len(sample_users),
        "events_created": len(sample_events),
        "sample_credentials": {
            "john@university.edu": "password123",
            "sarah@university.edu": "password123",
            "mike@university.edu": "password123",
            "emma@university.edu": "password123"
        }
    }

# Static file serving - Catch-all route for SPA (must be last)
@app.get("/{full_path:path}", response_class=HTMLResponse)
async def serve_static_or_spa(full_path: str):
    """Serve static files or SPA fallback"""
    # Try to serve the requested file if it exists
    file_path = full_path if full_path != "/" else "index.html"

    if os.path.isfile(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        # Set appropriate content type based on extension
        if file_path.endswith('.html'):
            return HTMLResponse(content)
        elif file_path.endswith('.css'):
            return HTMLResponse(content, media_type='text/css')
        elif file_path.endswith('.js'):
            return HTMLResponse(content, media_type='application/javascript')
        else:
            return HTMLResponse(content, media_type='text/plain')

    # For SPA routing, fallback to index.html for any unmatched route
    if not full_path.startswith(("api", "auth", "dashboard", "analytics", "admin")) and "." not in full_path:
        try:
            with open("index.html", "r", encoding="utf-8") as f:
                return HTMLResponse(f.read())
        except FileNotFoundError:
            pass

    # Return 404 for unmatched files
    return HTMLResponse("File not found", status_code=404)

# Initialize sample data on first run (not async)
initialize_sample_data()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=True)
