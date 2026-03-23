# Quick Start Checklist - Twilio Video Call Setup

## ✅ Implementation Status
- [x] Backend Twilio controller created
- [x] Backend Socket.io handler created  
- [x] Backend routes configured
- [x] Frontend video component created
- [x] Dashboard buttons integrated
- [x] Environment templates created
- [x] Dependencies added to package.json

## 🚀 What You Need to Do Now

### Phase 1: Get Twilio Credentials (5 minutes)
- [ ] Go to https://console.twilio.com/
- [ ] Login to your Twilio account
- [ ] Navigate to Account Settings → API Keys & Tokens
- [ ] Copy your **Account SID**
- [ ] Copy your **Auth Token**
- [ ] Create a new **API Key** and save both the Key and Secret
- [ ] Note: Keep these credentials secret! Never commit to version control.

### Phase 2: Backend Configuration (5 minutes)

#### Step 1: Copy environment template
```bash
cd backend
cp .env.example .env
```

#### Step 2: Edit `.env` file with your Twilio credentials
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_SECRET=your_api_secret_here
PORT=8000
CORS_ORIGIN=http://localhost:5173
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

#### Step 3: Install dependencies
```bash
npm install
# or
bun install
```

#### Step 4: Start backend server
```bash
npm run dev
```
**Expected output:** 
```
Server running on port 8000
Socket.io initialized
```

### Phase 3: Frontend Configuration (5 minutes)

#### Step 1: Copy environment template
```bash
cd frontend
cp .env.example .env
```

#### Step 2: Edit `.env` file
```
VITE_API_BASE_URL=http://localhost:8000
VITE_SOCKET_URL=http://localhost:8000
```

#### Step 3: Install dependencies
```bash
npm install
# or
bun install
```

#### Step 4: Start frontend server
```bash
npm run dev
```
**Expected output:**
```
VITE v... ready in ... ms

Local:    http://localhost:5173/
```

### Phase 4: Test the Video Call (10 minutes)

#### Setup Test Environment:
1. [ ] Backend running on port 8000 (`npm run dev`)
2. [ ] Frontend running on port 5173 (`npm run dev`)

#### Test Flow:
1. [ ] Open browser tab 1: `http://localhost:5173`
   - Login as **Student**
   - Navigate to "Live Session" (via Events Panel or direct URL)
   
2. [ ] Open browser tab 2 (Incognito): `http://localhost:5173`
   - Login as **Instructor**
   - Navigate to "Live Session"

3. [ ] From Student tab:
   - [ ] Select Instructor from "Available Users" dropdown
   - [ ] Click "Start Live Session"
   - [ ] Verify you see "Dialing..." status

4. [ ] From Instructor tab:
   - [ ] You should see "Incoming Video Call" notification
   - [ ] Click "Accept" button
   - [ ] Verify connection to video room

5. [ ] Test Features:
   - [ ] Both video streams appear
   - [ ] Send chat message from one side, verify it appears on other
   - [ ] Toggle your microphone button (verify it disables/enables)
   - [ ] Toggle your camera button (verify it disables/enables)
   - [ ] Click red phone icon to end call
   - [ ] Verify both sides return to "idle" state

## 🔍 Verification Checklist

### Backend Verification
- [ ] No errors in backend console when starting
- [ ] Can see "Socket.io initialized" message
- [ ] Check `http://localhost:8000/api/v1/video/generate-token` returns 400 (expected without POST data)

### Frontend Verification
- [ ] No build errors when starting frontend
- [ ] Can navigate to `/live-session` route without errors
- [ ] Frontend console shows "Socket connected" when page loads
- [ ] "Available Users" dropdown populates after logging in

### Connection Verification
- [ ] Backend logs show user registration when you login
- [ ] Frontend shows user dropdown is populated
- [ ] Can select users from dropdown (not greyed out)

## 📱 What Should Happen

**Student Side:**
1. Sees list of available instructors in dropdown
2. Clicks "Start Live Session" → status becomes "Dialing..."
3. Waits for instructor to accept

**Instructor Side:**
1. Gets "Incoming Video Call" notification
2. Accepts call
3. Both sides connect to Twilio Video room
4. Both see each other's video streams

**During Call:**
1. Can toggle mic/camera on/off
2. Can send/receive chat messages
3. Can see remote user's video
4. Can click phone icon to end call

## ❌ Common Issues & Fixes

| Problem | Solution |
|---------|----------|
| "Twilio token generation failed" | Check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in `.env` |
| Socket connection fails | Make sure backend is running on port 8000 and `CORS_ORIGIN` is correct |
| Video doesn't appear | Check browser camera permissions; verify both users connected to room |
| Chat not working | Ensure Socket.io shows as "connected" in console |
| "User not found" in dropdown | Make sure second user is logged in on different tab/browser |
| "VIDEO_TOKEN_REQUEST_FAILED" | Check your TWILIO_API_KEY and TWILIO_API_SECRET |

## 📊 File Overview

| File | Purpose |
|------|---------|
| `backend/.env` | Your Twilio credentials (CREATE THIS) |
| `backend/src/controllers/videoCall.controller.js` | Generates video tokens |
| `backend/src/utils/videoCallSocket.js` | Real-time call signaling |
| `frontend/.env` | Backend URLs (CREATE THIS) |
| `frontend/src/pages/StudentInstructorVideoCallNew.tsx` | Video call UI |
| `frontend/src/App.tsx` | Route at `/live-session` |

## 🎯 Success Criteria

✅ You'll know it's working when:
1. Backend starts without errors
2. Frontend builds without errors  
3. Two logged-in users can see each other in the user dropdown
4. Call can be initiated and accepted
5. Video streams appear on both sides
6. Chat messages send and receive
7. Mic/camera toggles work

## 📞 Once Everything Works

- Both students and instructors access video calls via "Live Session" button
- Calls are 1-to-1 (one student, one instructor)
- Each call gets unique room ID: `room-${studentId}-${instructorId}-${timestamp}`
- Call history currently stored in-memory (resets on server restart)
- Calls are peer-to-peer via Twilio Video (low latency, high quality)

---

**Ready to start?** Begin with Phase 1 above to get your Twilio credentials!
