# Twilio Video Call Integration Setup Guide

## Overview
This guide walks you through setting up real-time video calls between students and instructors using Twilio Video and Socket.io.

## Prerequisites
- Twilio Account with Video API enabled
- MongoDB database
- Node.js and npm/bun

## Step-by-Step Setup

### 1. Get Twilio Credentials

1. Go to [Twilio Console](https://console.twilio.com/)
2. Create a new project or use an existing one
3. Navigate to **Account Settings** → **API Keys & Tokens**
4. Create a new API Key and save the credentials:
   - `Account SID` (from sidebar)
   - `Auth Token` (from Account Settings)
   - `API Key` (from API Keys page)
   - `API Secret` (from API Keys page)

### 2. Backend Setup

#### 2.1 Install Dependencies
```bash
cd backend
npm install
# or
bun install
```

#### 2.2 Create `.env` File
Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your values:
```
TWILIO_ACCOUNT_SID=AC... (your Account SID)
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_API_KEY=SKxxxxx
TWILIO_API_SECRET=your_api_secret_here
```

#### 2.3 Start Backend Server
```bash
npm run dev
```

The server will start on port 8000 with Socket.io ready.

### 3. Frontend Setup

#### 3.1 Install Dependencies
```bash
cd frontend
npm install
# or
bun install
```

#### 3.2 Create `.env` File
```bash
cp .env.example .env
```

Edit `.env` with backend URLs:
```
VITE_API_BASE_URL=http://localhost:8000
VITE_SOCKET_URL=http://localhost:8000
```

#### 3.3 Start Frontend Server
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Architecture Overview

### Backend Components

**1. Twilio Controller** (`backend/src/controllers/videoCall.controller.js`)
- Generates temporary access tokens for Twilio Video
- Manages video room participants
- Ends video sessions

**2. Socket.io Handler** (`backend/src/utils/videoCallSocket.js`)
- Manages user registration and availability
- Handles call initiation, acceptance, rejection
- Routes chat messages between participants
- Manages call lifecycle

**3. Routes** (`backend/src/routes/videoCall.routes.js`)
- `POST /api/v1/video/generate-token` - Generate video token
- `GET /api/v1/video/room/:room/participants` - Get room participants
- `POST /api/v1/video/end-room` - End video session

### Frontend Components

**Video Call Page** (`frontend/src/pages/StudentInstructorVideoCallNew.tsx`)
- Manages Twilio Video connection
- Handles Socket.io events
- Displays video streams from both participants
- Provides chat functionality

**Dashboard Buttons** 
- Student: "Connect with Instructor" button in Events Panel
- Instructor: "Start Live Session" button on dashboard

## Socket.io Events

### Client → Server
- `user:register` - Register user when connecting
- `call:initiate` - Initiate a call to another user
- `call:accept` - Accept an incoming call
- `call:reject` - Reject an incoming call
- `call:end` - End an active call
- `call:chat` - Send a chat message
- `get:users-by-role` - Get available users by role

### Server → Client
- `user:registered` - Confirm user registration
- `user:online` - Broadcast when user comes online
- `user:offline` - Broadcast when user goes offline
- `call:incoming` - Notify of incoming call
- `call:ringing` - Notify that call is ringing
- `call:accepted` - Notify that call was accepted
- `call:rejected` - Notify that call was rejected
- `call:ended` - Notify that call ended
- `call:chat` - Receive chat message

## Features Implemented

✅ **Real-time Video Calls**
- Powered by Twilio Video API
- HD video quality (640x480)
- Automatic bandwidth optimization

✅ **Socket.io Real-time Events**
- Instant call notifications
- Live chat during calls
- User presence tracking

✅ **Call Management**
- Call initiation and acceptance flow
- Call rejection and ending
- User availability by role (Student/Instructor)

✅ **Interactive Features**
- Mic/Camera ON/OFF toggle
- Live chat messaging
- User ID sharing (copy to clipboard)

## Testing the Integration

### Test Flow

1. **Open two browsers/tabs:**
   - Tab 1: Login as Student
   - Tab 2: Login as Instructor

2. **Initiate a call from Student:**
   - Navigate to "Live Session" (via Events Panel)
   - Select available Instructor from dropdown
   - Click "Start Live Session"

3. **Accept call from Instructor:**
   - Instructor sees "Incoming Session" notification
   - Click "Accept" button
   - Both are now connected in video call

4. **Test Features:**
   - Send chat messages
   - Toggle mic/camera
   - End call with red phone button

## Troubleshooting

### "Failed to generate video token"
- Check your Twilio credentials in `.env`
- Verify API Key permissions
- Ensure Twilio account has Video API enabled

### Socket.io connection fails
- Check backend is running on correct port (8000)
- Verify `CORS_ORIGIN` includes your frontend URL
- Check browser console for connection errors

### Video not displaying
- Check browser camera/mic permissions
- Verify both users have been connected to video room
- Check browser console for Twilio SDK errors

### Chat not working
- Ensure Socket.io is fully connected (check status message)
- Verify call is in "connected" state
- Check backend logs for socket errors

## Production Deployment

For production, update your `.env` files:

```
# Backend
CORS_ORIGIN=https://your-domain.com
MONGODB_URI=your_production_mongodb_uri
TWILIO_ACCOUNT_SID=production_sid
# ... other production values

# Frontend
VITE_API_BASE_URL=https://api.your-domain.com
VITE_SOCKET_URL=https://api.your-domain.com
```

## File Structure

```
backend/
├── src/
│   ├── controllers/
│   │   └── videoCall.controller.js    ← Twilio token generation
│   ├── routes/
│   │   └── videoCall.routes.js        ← API endpoints
│   ├── utils/
│   │   └── videoCallSocket.js         ← Socket.io handlers
│   ├── app.js                          ← Updated with video routes
│   └── index.js                        ← Socket.io setup

frontend/
├── src/
│   ├── pages/
│   │   └── StudentInstructorVideoCallNew.tsx  ← Video call UI
│   ├── components/
│   │   └── dashboard/
│   │       ├── LiveSessionButton.tsx
│   │       └── InstructorLiveSessionButton.tsx
│   └── App.tsx                         ← Route added

.env.example files with instructions
```

## Next Steps

1. Install dependencies: `npm install` (both frontend & backend)
2. Create `.env` files with Twilio credentials
3. Start backend: `npm run dev` (from backend dir)
4. Start frontend: `npm run dev` (from frontend dir)
5. Test with two browser instances

## Support & Resources

- [Twilio Video Docs](https://www.twilio.com/docs/video)
- [Socket.io Docs](https://socket.io/docs/)
- [Twilio Console](https://console.twilio.com/)

## Security Notes

- Never commit `.env` files to version control
- Use environment-specific keys for dev/prod
- Tokens expire after 1 hour by default (configurable)
- Socket.io connections use CORS validation
