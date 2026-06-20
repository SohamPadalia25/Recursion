<div align="center">

# StudyBuddy

### AI-Powered Adaptive Learning Platform

*Build smarter courses. Learn faster. Grow further.*

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Neo4j](https://img.shields.io/badge/Neo4j-Graph_DB-008CC1?logo=neo4j&logoColor=white)](https://neo4j.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Running the Application](#running-the-application)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Database Models](#database-models)
- [Python Services](#python-services)
- [Seeding & Demo Data](#seeding--demo-data)
- [Testing](#testing)
- [Contributing](#contributing)

---

## Overview

**StudyBuddy** is a full-stack, AI-powered adaptive learning management system (LMS) designed for the modern education landscape. It empowers instructors to build rich, structured courses with AI assistance, while students benefit from personalized learning paths, real-time video tutoring, automated assessments, and intelligent feedback loops.

The platform bridges the gap between static course content and dynamic, adaptive education — combining large language models, computer vision, blockchain certification, and graph-based learning analytics into a single cohesive product.

---

## Key Features

### For Instructors
- **AI Course Builder** — Generate full course hierarchies (Modules → Topics → Subtopics) from a title and description using Groq LLM
- **3-Step Course Wizard** — Guided course creation: metadata → structure → content upload
- **Rich Content Support** — Video (YouTube/Cloudinary), PDFs, notes, links, and code snippets per topic node
- **Learning Outcomes** — Tag each node with Bloom's Taxonomy levels (Remember → Create)
- **Prerequisite Graphs** — Define dependencies and alternate learning paths between topics
- **AI Quiz Generation** — Auto-generate assessments from uploaded PDFs
- **Live Video Sessions** — 1-to-1 Twilio video calls with students
- **Analytics Dashboard** — Enrollment stats, completion rates, and student engagement

### For Students
- **Adaptive Learning Paths** — System adjusts recommended content based on quiz performance and prerequisite gaps
- **AI Tutor** — Socratic-method conversational tutor powered by Groq LLM with full session context
- **Attention Tracking** — Real-time attention scoring via MediaPipe face landmark detection during video lessons
- **Smart Study Plans** — AI-generated daily schedules based on goal and deadline
- **Flashcard Engine** — Auto-generated spaced-repetition flashcards from course content
- **Progress Visualization** — Charts, streaks, and completion dashboards
- **Gamification** — Badges, leaderboards, and login streak rewards
- **Certificates** — Auto-issued completion certificates with QR verification and optional blockchain anchoring
- **Job Recommendations** — Course-completion-based career opportunity matching
- **AI Video Generation** — On-demand educational videos with TTS narration and AI-generated visuals

### For Admins
- **Course Approval Workflow** — Review and publish instructor-submitted courses
- **Platform Analytics** — Users, enrollments, revenue, and engagement metrics
- **Content Moderation** — Flag and review reported discussions and reviews
- **User Management** — Browse, filter, and manage all user accounts by role

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18.3.1 | UI Framework |
| TypeScript | 5.8.3 | Type Safety |
| Vite | 5.4.19 | Build Tool |
| Tailwind CSS | 3.4.17 | Styling |
| shadcn/ui + Radix UI | latest | Component Library |
| TanStack React Query | 5.83.0 | Server State |
| React Router DOM | 6.30.1 | Client Routing |
| React Hook Form + Zod | 7.61.1 / 3.25.76 | Forms & Validation |
| Framer Motion | 12.38.0 | Animations |
| Socket.io-client | 4.7.2 | Real-time Events |
| Twilio Video | 2.26.0 | Video Conferencing |
| React Force Graph 2D | latest | Graph Visualization |
| Recharts | 2.15.4 | Charts & Analytics |
| Monaco Editor | 0.55.1 | In-Browser Code Editor |
| @mediapipe/tasks-vision | 0.10.33 | Attention Tracking |
| Liveblocks | 3.15.5 | Real-time Collaboration |
| jsPDF | 4.2.1 | PDF Generation |
| qrcode.react | 4.2.0 | QR Code Rendering |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js + Express | 5.2.1 | API Server |
| MongoDB + Mongoose | 9.3.1 | Primary Database |
| Neo4j | latest | Learning Graph Database |
| Socket.io | 4.7.2 | Real-time WebSockets |
| Twilio SDK | 4.20.0 | Video Conferencing |
| Groq SDK | 1.1.1 | Fast LLM (Llama-based) |
| Google Generative AI | 0.24.1 | Gemini LLM |
| Cloudinary | 2.9.0 | Media Storage & CDN |
| Multer | 2.1.1 | File Upload Handling |
| jsonwebtoken | 9.0.3 | JWT Authentication |
| bcryptjs | 3.0.3 | Password Hashing |
| Nodemailer | 6.9.14 | Transactional Email |
| ethers.js | 6.15.0 | Blockchain Integration |
| Hardhat | 3.2.0 | Smart Contract Dev |
| pdf-parse | 2.4.5 | PDF Text Extraction |
| qrcode | 1.5.4 | QR Code Generation |

### Python Services
| Technology | Purpose |
|---|---|
| MoviePy + OpenCV | Video Assembly & Processing |
| Edge-TTS | Text-to-Speech Narration |
| MediaPipe | Face Landmark Attention Tracking |
| Pollinations.ai API | AI Image Generation |
| Groq (Python) | Script & Content Generation |

---

## Project Structure

```
Recursion/
├── backend/
│   ├── src/
│   │   ├── index.js                  # Server entry point (Socket.io + Express)
│   │   ├── app.js                    # App config & route registration
│   │   ├── db/
│   │   │   └── db.js                 # MongoDB connection
│   │   ├── config/
│   │   │   └── neo4j.js              # Neo4j connection setup
│   │   ├── models/                   # ~21 Mongoose schemas
│   │   │   ├── user.model.js
│   │   │   ├── course.model.js
│   │   │   ├── module.model.js
│   │   │   ├── topic.model.js
│   │   │   ├── subtopic.model.js
│   │   │   ├── content.model.js
│   │   │   ├── lesson.model.js
│   │   │   ├── enrollment.model.js
│   │   │   ├── progress.model.js
│   │   │   ├── quiz.model.js
│   │   │   ├── quizattempt.model.js
│   │   │   ├── badge.model.js
│   │   │   ├── certificate.model.js
│   │   │   ├── discussion.model.js
│   │   │   ├── review.model.js
│   │   │   ├── notification.model.js
│   │   │   ├── call.model.js
│   │   │   ├── flashCard.model.js
│   │   │   ├── notes.model.js
│   │   │   ├── Aitutorchat.model.js
│   │   │   └── studyPlan.model.js
│   │   ├── controllers/              # ~20 business-logic controllers
│   │   ├── routes/                   # REST API route definitions
│   │   ├── services/                 # ~13 service modules (AI, badges, blockchain...)
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js    # JWT verification
│   │   │   ├── role.middleware.js    # Role-based access control
│   │   │   └── multer.middleware.js  # File upload handling
│   │   └── utils/                   # Helpers, seeders, response wrappers
│   ├── video_pipeline/               # Python video generation service
│   │   ├── pipeline/
│   │   │   ├── extractor.py
│   │   │   ├── summarizer.py
│   │   │   ├── script_generator.py
│   │   │   ├── storyboard.py
│   │   │   ├── tts_engine.py
│   │   │   ├── image_generator.py
│   │   │   └── video_assembler.py
│   │   ├── utils/
│   │   └── main.py
│   ├── audio_pipeline/               # Audio processing service
│   ├── pipeline_bridge.py            # Python ↔ Node.js bridge
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx                   # Router & layout
│   │   ├── auth/                     # AuthContext, ProtectedRoute
│   │   ├── pages/
│   │   │   ├── Landing.tsx
│   │   │   ├── auth/                 # Login, Signup
│   │   │   ├── student/              # ~16 student pages
│   │   │   ├── instructor/           # ~5 instructor pages
│   │   │   └── admin/                # ~5 admin pages
│   │   ├── components/
│   │   │   ├── ui/                   # ~50 shadcn/ui primitives
│   │   │   ├── dashboard/            # Sidebars, panels, widgets
│   │   │   ├── instructor/           # Course builder components
│   │   │   ├── roadmap/              # Neo4j graph visualization
│   │   │   └── [shared components]
│   │   └── hooks/                    # Custom React hooks
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.ts
├── attention_tracker.py              # Standalone attention monitoring script
├── ARCHITECTURE.md
├── COURSE_BUILDER_DOCS.md
├── INTEGRATION_GUIDE.md
├── QUICK_START.md
└── README.md
```

---

## Getting Started

### Prerequisites

Ensure you have the following installed:

- **Node.js** v18+ and **npm** v9+
- **Python** 3.9+ with `pip`
- **MongoDB** (Atlas cloud or local instance)
- **Neo4j** (Aura cloud or local Desktop)
- Accounts for: **Groq**, **Cloudinary**, **Twilio** (see [Environment Variables](#environment-variables))

---

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/your-org/recursion.git
cd recursion
```

**2. Install backend dependencies**

```bash
cd backend
npm install
```

**3. Install frontend dependencies**

```bash
cd ../frontend
npm install
```

**4. Install Python dependencies**

```bash
cd ../backend/video_pipeline
pip install moviepy opencv-python numpy edge-tts groq requests
```

```bash
# For attention tracking (in repo root)
pip install mediapipe opencv-python numpy
```

---

### Environment Variables

#### Backend — `backend/.env`

Create this file from the template below and fill in your credentials:

```env
# Server
PORT=8000
CORS_ORIGIN=http://localhost:5173

# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>

# JWT
ACCESS_TOKEN_SECRET=your_secure_jwt_secret
ACCESS_TOKEN_EXPIRY=7d
REFRESH_TOKEN_SECRET=your_secure_refresh_secret
REFRESH_TOKEN_EXPIRY=30d

# Twilio (Video Conferencing)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_SECRET=your_twilio_api_secret

# LLM APIs
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_GENERATIVE_AI_KEY=your_gemini_api_key

# Cloudinary (Media Storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Email (Nodemailer)
MAIL_HOST=smtp.gmail.com
MAIL_USER=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_FROM_EMAIL=noreply@recursion.app

# Neo4j (Graph Database)
NEO4J_URI=neo4j+s://xxxxxxxx.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_neo4j_password

# Blockchain (Optional — for certificate anchoring)
BLOCKCHAIN_RPC_URL=http://localhost:8545
PRIVATE_KEY=your_ethereum_private_key

# WhatsApp Notifications (Optional)
WHATSAPP_API_KEY=your_whatsapp_api_key
```

#### Frontend — `frontend/.env`

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_SOCKET_URL=http://localhost:8000
VITE_TWILIO_ENABLED=true
```

> **Note:** Never commit `.env` files. Both are included in `.gitignore`.

---

### Database Setup

**MongoDB** is configured automatically on first run via Mongoose. Ensure your `MONGODB_URI` is correct.

**Neo4j** requires initial graph seeding:

```bash
cd backend
npm run seed:neo4j
```

---

### Running the Application

**Start the backend server:**

```bash
cd backend
npm run dev
# API server starts at http://localhost:8000
```

**Start the frontend dev server** (in a separate terminal):

```bash
cd frontend
npm run dev
# App available at http://localhost:5173
```

**Start the attention tracker** (optional — standalone script):

```bash
# From the repo root
python attention_tracker.py
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Browser                           │
│              React 18 + TypeScript + Tailwind CSS               │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│   │ Student  │  │Instructor│  │  Admin   │  │  Landing /   │   │
│   │  Pages   │  │  Pages   │  │  Pages   │  │  Auth Pages  │   │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘   │
│        └─────────────┴─────────────┴────────────────┘           │
│                     React Query + Axios                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP / WebSocket
┌──────────────────────────▼──────────────────────────────────────┐
│                      Express.js API                             │
│                     Node.js v18+ / ES Modules                   │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│   │  Routes  │→ │ Middlewares│→│Controllers│→│  Services    │   │
│   │  /api/v1 │  │ JWT/Role │  │ Business │  │ AI/Groq      │   │
│   └──────────┘  └──────────┘  │  Logic   │  │ Blockchain   │   │
│                               └────┬─────┘  │ Email/SMS    │   │
│   ┌──────────────────────────┐     │        └──────────────┘   │
│   │     Socket.io Server     │     │                            │
│   │  (Video Call Signaling)  │     │                            │
│   └──────────────────────────┘     │                            │
└───────────────────────────────────┬──────────────────────────────┘
                                    │
          ┌─────────────────────────┼────────────────────────┐
          │                         │                        │
┌─────────▼──────┐       ┌──────────▼────────┐   ┌──────────▼──────┐
│    MongoDB     │       │      Neo4j         │   │   Cloudinary    │
│  Primary DB    │       │  Graph Database    │   │  Media/CDN      │
│  (Mongoose)    │       │  (Learning Paths)  │   │  (Files/Images) │
└────────────────┘       └───────────────────┘   └─────────────────┘
          │
┌─────────▼───────────────────────────────────────────────────────┐
│                     Python Services                             │
│   ┌──────────────────────┐    ┌─────────────────────────────┐   │
│   │   Video Pipeline     │    │    Attention Tracker        │   │
│   │  Extract → Summarize │    │   MediaPipe Face Landmarks  │   │
│   │  → Script → TTS      │    │   Real-time Attention Score │   │
│   │  → Images → Assemble │    └─────────────────────────────┘   │
│   └──────────────────────┘                                      │
└─────────────────────────────────────────────────────────────────┘
          │
┌─────────▼─────────────────────────────────────────────────────┐
│                   External Services                            │
│  Groq LLM  │  Google Gemini  │  Twilio Video  │  Blockchain   │
│  (Tutoring │  (Generation)   │  (Conferencing)│  (Certs)      │
│   & Quizzes│                 │                │               │
└────────────────────────────────────────────────────────────────┘
```

### Data Flow — AI Course Generation

```
Instructor Input (Title + Description)
         │
         ▼
POST /api/v1/courses/:id/generate-structure
         │
         ▼
courseGeneration.controller.js
         │
         ▼
groq.service.js ──► Groq LLM (Llama 3)
         │
         ▼
Structured JSON: { modules: [{ topics: [{ subtopics: [] }] }] }
         │
         ▼
POST /api/v1/courses/:id/save-structure
         │
         ▼
Persisted to MongoDB (Module, Topic, Subtopic collections)
         │
         ▼
Neo4j Graph seeded with prerequisite relationships
```

---

## API Reference

All endpoints are prefixed with `/api/v1` unless noted.

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/users/register` | Create a new account |
| `POST` | `/users/login` | Authenticate and receive JWT |
| `POST` | `/users/refresh-token` | Refresh access token |
| `POST` | `/users/logout` | Invalidate session |
| `GET` | `/users/me` | Get current user profile |
| `PATCH` | `/users/update-profile` | Update profile details |

### Courses

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/courses` | List all published courses |
| `GET` | `/courses/:courseId` | Get course details |
| `POST` | `/courses` | Create a new course (Instructor) |
| `PUT` | `/courses/:courseId` | Update course metadata |
| `DELETE` | `/courses/:courseId` | Delete a course |
| `POST` | `/courses/submit-for-approval` | Submit course for admin review |
| `GET` | `/courses/:courseId/structure` | Get full course hierarchy tree |

### AI Course Generation

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/courses/:courseId/generate-structure` | Generate module/topic tree with AI |
| `POST` | `/courses/:courseId/save-structure` | Persist generated structure to DB |

### Modules, Topics & Content

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/modules/:courseId` | List modules for a course |
| `POST` | `/modules` | Create a module |
| `PUT` | `/modules/:moduleId` | Update a module |
| `DELETE` | `/modules/:moduleId` | Delete a module |
| `GET` | `/lessons/:moduleId` | List lessons in a module |
| `POST` | `/lessons` | Create a lesson |
| `PUT` | `/lessons/:lessonId` | Update a lesson |

### Quizzes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/quizzes/my` | List quizzes created by instructor |
| `POST` | `/quizzes/manual` | Create quiz manually |
| `POST` | `/quizzes/generate` | Generate quiz from uploaded PDF |
| `POST` | `/quizzes/:quizId/start` | Start a quiz attempt |
| `POST` | `/quizzes/:quizId/submit` | Submit quiz answers |
| `GET` | `/quizzes/attempts/:attemptId/report` | Get attempt report |

### Enrollments & Progress

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/enrollments` | Enroll in a course |
| `GET` | `/enrollments/my` | Get student's enrollments |
| `GET` | `/progress/:courseId` | Get course progress |
| `POST` | `/progress/mark-complete` | Mark a lesson complete |
| `GET` | `/progress/analytics` | Get analytics data |

### Video Conferencing

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/video/generate-token` | Get Twilio room token |
| `GET` | `/video/rooms` | List active video rooms |
| `POST` | `/video/end-room` | Terminate a video room |

### AI & Tutoring

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/ai/chat` | Send message to AI tutor |
| `GET` | `/ai/chat-history` | Retrieve conversation history |

### Certificates

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/certificates/generate` | Issue a course certificate |
| `GET` | `/certificates/:userId` | Get user's certificates |
| `GET` | `/verify` | Public certificate verification |

### Discussions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/discussions/:courseId` | Get course forum posts |
| `POST` | `/discussions` | Create a new post |
| `POST` | `/discussions/:postId/reply` | Reply to a post |
| `POST` | `/discussions/:postId/upvote` | Upvote a post |

### Video Generation Pipeline

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/pipeline/generate-video` | Trigger AI video generation |
| `POST` | `/pipeline/analyze-attention` | Analyze student attention data |

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/stats` | Platform-wide statistics |
| `GET` | `/admin/users` | List and filter all users |
| `POST` | `/admin/approve-course` | Approve a course for publishing |
| `GET` | `/admin/moderation` | View flagged content |

### Learning Graph

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/graph/course/:courseId` | Get course knowledge graph |
| `GET` | `/graph/learning-paths/:userId` | Get personalized learning paths |

---

## Database Models

### Core Collections

| Model | Key Fields | Purpose |
|-------|-----------|---------|
| `User` | `username, email, role, avatar` | Accounts (student/instructor/admin) |
| `Course` | `title, instructor, status, isApproved` | Course metadata |
| `Module` | `title, course, order, prerequisiteModule` | Level-1 course hierarchy |
| `Topic` | `title, module, difficulty, learningOutcomes, prerequisites` | Level-2 hierarchy |
| `Subtopic` | `title, topic, difficulty, isOptional` | Level-3 hierarchy |
| `Content` | `type, url, topic, subtopic, lesson` | Multi-type content node |
| `Lesson` | `title, module, videoUrl, order` | Legacy lesson structure |
| `Enrollment` | `student, course, isCompleted, completionPercentage` | Student enrollment |
| `Progress` | `student, lesson, isCompleted, attentionScore` | Lesson completion tracking |
| `Quiz` | `course, questions, passingScore, isAIGenerated` | Assessment definitions |
| `QuizAttempt` | `student, quiz, score, answers, isPassed` | Attempt records |
| `Badge` | `student, type, course, awardedAt` | Achievement awards |
| `Certificate` | `userId, courseId, hash, qrCodeUrl, onChain*` | Completion certificates |
| `Discussion` | `course, author, content, parentPost, upvotes` | Forum posts & replies |
| `Review` | `student, course, rating, reviewText` | Star ratings & feedback |
| `Call` | `callerId, calleeId, roomName, status, duration` | Video call records |
| `FlashCard` | `course, topic, front, back, nextReviewDate` | Spaced repetition cards |
| `Notes` | `student, course, title, content, tags` | Student notes |
| `AITutorChat` | `student, course, messages[]` | Tutor conversation history |
| `StudyPlan` | `student, course, goal, deadline, dailySchedule` | Adaptive study schedules |
| `Notification` | `user, type, title, isRead` | In-app notifications |

### Learning Outcome (Bloom's Taxonomy)

Topics and Subtopics support structured learning outcomes:

```javascript
learningOutcomes: [{
  description: String,
  bloomLevel: "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create"
}]
```

### Adaptive Path Definition

```javascript
alternatePaths: [{
  condition: String,          // e.g., "if quiz score < 60%"
  suggestedTopicId: ObjectId,
  description: String
}]
```

---

## Python Services

### Video Generation Pipeline

Converts a topic title or PDF document into a full narrated educational video.

**Pipeline Stages:**

```
Input (Topic / PDF)
    → extractor.py      — Extract raw text
    → summarizer.py     — Summarize with Groq LLM
    → script_generator.py — Write narration script
    → storyboard.py     — Plan visual scenes
    → tts_engine.py     — Generate audio (Edge-TTS)
    → image_generator.py — Generate visuals (Pollinations.ai)
    → video_assembler.py — Combine into MP4 (MoviePy)
```

**CLI Usage:**

```bash
cd backend/video_pipeline

# Generate from topic name
python main.py --topic "Introduction to Neural Networks" --duration 5 --voice male_us

# Generate without AI images (faster)
python main.py --topic "Binary Search Trees" --duration 3 --no-ai-images

# Generate from PDF
python main.py --pdf /path/to/lecture.pdf --duration 8 --voice female_uk
```

**Available Voice Options:** `male_us`, `female_us`, `male_uk`, `female_uk`

---

### Attention Tracker

Monitors student engagement during video playback using facial landmark analysis.

```bash
# Run from the repo root
python attention_tracker.py
```

**Metrics measured:**
- Head pose (yaw, pitch, roll) — detects looking away
- Eye gaze direction — detects distraction
- Blink rate — detects drowsiness
- Sustained focus duration — aggregated attention score (0–100)

Scores are stored in the `Progress` model's `attentionScore` field and used to trigger adaptive recommendations.

---

## Seeding & Demo Data

The backend includes several seed scripts for development and demonstration:

```bash
cd backend

# Initialize Neo4j learning graph schema
npm run seed:neo4j

# Create sample courses with modules and lessons
npm run seed:demo-courses

# Initialize platform data (categories, tags, default config)
npm run seed:platform

# Setup blockchain certificate workflow
npm run seed:certificate-workflow

# Generate sample student progress and reviews
npm run seed:learning-progress
```

---

## Testing

### Frontend

Tests are written with **Vitest** and **React Testing Library**. End-to-end tests use **Playwright**.

```bash
cd frontend

# Run unit/component tests once
npm run test

# Run in watch mode (development)
npm run test:watch

# Run Playwright E2E tests
npx playwright test
```

### Backend

Manual API testing is recommended via an HTTP client (e.g., Postman, Bruno, or `curl`). The API follows RESTful conventions and returns standardized `ApiResponse` / `ApiError` wrappers.

### Smart Contracts (Blockchain)

```bash
cd backend

# Compile Solidity contracts
npm run hardhat:compile

# Start a local Hardhat blockchain node
npm run chain:local

# Deploy contracts to local node
npm run deploy:local
```

---

## Available Scripts

### Backend (`backend/`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start server in development mode (Nodemon) |
| `npm run seed:neo4j` | Initialize Neo4j graph |
| `npm run seed:demo-courses` | Create demo courses |
| `npm run seed:platform` | Initialize platform |
| `npm run seed:certificate-workflow` | Setup blockchain certs |
| `npm run seed:learning-progress` | Generate sample progress |
| `npm run hardhat:compile` | Compile smart contracts |
| `npm run chain:local` | Run local Hardhat node |
| `npm run deploy:local` | Deploy contracts locally |

### Frontend (`frontend/`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run build:dev` | Development build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest |
| `npm run test:watch` | Vitest in watch mode |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes and commit with descriptive messages
4. Push your branch and open a Pull Request against `main`

Please ensure:
- All frontend TypeScript compiles without errors (`npm run build`)
- ESLint passes (`npm run lint`)
- New backend routes follow the existing `controller → service → model` pattern
- Environment variables are documented in this README and never hardcoded

---

## License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

Built with by the Recursion team

</div>
