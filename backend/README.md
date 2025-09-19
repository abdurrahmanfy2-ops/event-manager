# Campus Event Hub Backend

A complete Node.js backend for the Campus Event Hub web application, built with Express.js, MongoDB, and JWT authentication.

## Features

- **User Authentication**: Register/Login with JWT tokens and refresh token support
- **Role-based Access Control**: Student and Admin roles
- **Club Management**: Create, join, and manage clubs
- **Event Management**: Full CRUD for events with capacity management
- **Achievement System**: Gamification with points and achievements
- **College & Partner Management**: Admin CRUD operations
- **Dashboard Stats**: Analytics and reporting
- **Search & Filters**: Advanced query capabilities
- **File Uploads**: Local storage for images (Cloudinary ready)
- **RESTful API**: Complete REST endpoints with validation

## Tech Stack

- **Runtime**: Node.js with ES Modules
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens with bcrypt hashing
- **Validation**: Express-validator
- **Security**: Helmet, CORS, Rate limiting
- **File Upload**: Multer (local storage)

## Project Structure

```
backend/
├── src/
│   ├── controllers/     # Route handlers
│   ├── models/         # Mongoose schemas
│   ├── routes/         # Express routes
│   ├── middleware/     # Custom middleware
│   ├── utils/          # Helper functions
│   └── config/         # Configuration files
├── scripts/            # Database seeding
├── uploads/           # Static file uploads
├── server.js          # Main server file
├── package.json
├── .env               # Environment variables
└── README.md
```

## Installation & Setup

### Prerequisites

- Node.js 18+
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### 1. Clone and Install

```bash
cd backend
npm install
```

### 2. Environment Variables

Copy `.env` and update values:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/campus-event-hub-dev
JWT_SECRET=your_super_secret_jwt_key_here
JWT_REFRESH_SECRET=your_refresh_secret_key_here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
NODE_ENV=development
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
FRONTEND_URL=http://localhost:3000
```

### 3. Seed Database

```bash
npm run seed
```

This creates sample data including:
- Admin user: `admin@university.edu` / `admin123`
- Test users: `john@university.edu`, `sarah@university.edu`, `mike@university.edu` / `password123`
- Sample colleges, clubs, events, achievements

### 4. Start Development Server

```bash
npm run dev
```

Server runs on `http://localhost:5000`

## API Endpoints

### Authentication
```
POST   /api/auth/register          # Register new user
POST   /api/auth/login             # Login user
GET    /api/auth/me                # Get current user profile
POST   /api/auth/logout            # Logout (client-side)
GET    /api/auth/google            # Google OAuth stub
GET    /api/auth/google/callback   # Google OAuth callback
```

### Users
```
GET    /api/users/:id              # Get user by ID
PUT    /api/users/:id              # Update user profile
GET    /api/users/:id/achievements  # Get user achievements
POST   /api/users/:id/awards       # Award achievement (admin)
```

### Clubs
```
GET    /api/clubs                  # Get all clubs
GET    /api/clubs/:id              # Get club by ID
POST   /api/clubs                  # Create club (admin)
PUT    /api/clubs/:id              # Update club (admin)
POST   /api/clubs/:id/join         # Join club
POST   /api/clubs/:id/leave        # Leave club
```

### Events
```
GET    /api/events                 # Get all events
GET    /api/events/:id             # Get event by ID
POST   /api/events                 # Create event (club members only)
PUT    /api/events/:id             # Update event (creators only)
DELETE /api/events/:id             # Delete event (admin/creators)
POST   /api/events/:id/join        # Join event
POST   /api/events/:id/leave       # Leave event
```

### Colleges
```
GET    /api/colleges               # Get all colleges
GET    /api/colleges/:id           # Get college by ID
POST   /api/colleges               # Create college (admin)
```

### Partners
```
GET    /api/partners               # Get all partners
GET    /api/partners/:id           # Get partner by ID
POST   /api/partners               # Create partner (admin)
```

### Achievements
```
GET    /api/achievements           # Get all achievements
```

### Dashboard
```
GET    /api/dashboard/stats        # Get dashboard statistics
```

### Search
```
GET    /api/search?q=...           # General search
GET    /api/events?club=X&college=Y&from=Z&to=W # Filtered events
```

### File Uploads
```
POST   /api/upload                 # Upload files (authenticated users)
```

## Authentication Flow

1. **Register/Login**: User authenticates and receives access + refresh tokens
2. **Access Token**: Include in Authorization header: `Bearer <token>`
3. **Refresh Token**: Use when access token expires (implement on frontend)
4. **Protected Routes**: Auth middleware validates tokens automatically

### Frontend Integration Example

```javascript
// Login
const loginUser = async (email, password) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();

  if (data.access_token) {
    localStorage.setItem('accessToken', data.access_token);
    localStorage.setItem('refreshToken', data.refresh_token);
  }
  return data;
};

// Authenticated request
const fetchEvents = async () => {
  const token = localStorage.getItem('accessToken');
  const response = await fetch('/api/events', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

// Join event
const joinEvent = async (eventId) => {
  const token = localStorage.getItem('accessToken');
  const response = await fetch(`/api/events/${eventId}/join`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

## Database Models

### User
```javascript
{
  name: String,
  email: String (unique),
  password: String,
  role: String (enum: 'student', 'admin'),
  points: Number,
  achievements: [ObjectId],
  joinedClubs: [ObjectId],
  attendingEvents: [ObjectId]
}
```

### Club
```javascript
{
  name: String,
  description: String,
  college: ObjectId,
  members: [ObjectId],
  events: [ObjectId]
}
```

### Event
```javascript
{
  title: String,
  description: String,
  date: Date,
  venue: String,
  club: ObjectId,
  attendees: [ObjectId],
  capacity: Number,
  imageUrl: String,
  isActive: Boolean
