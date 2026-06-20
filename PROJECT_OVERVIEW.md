# Project Overview — "Recursion" AI-Powered Learning Platform

> Interview preparation document. Every section references actual files, models, routes, and functions from the codebase.

---

## 1. Project Summary

**Recursion** is a full-stack, AI-driven e-learning / LMS (Learning Management System) platform. It lets instructors build courses (modules → topics → subtopics → lessons), and gives students an adaptive, agent-assisted learning experience: AI tutoring, auto-generated adaptive quizzes, spaced-repetition flashcards, personalized study plans, CV-based attention proctoring, blockchain-verified completion certificates, live video classes, and AI media-generation pipelines (text/PDF → narrated audio or video lessons).

**Type of application:** Full-stack web application with a **monolithic Express REST API + WebSocket server** backend, a **React (Vite) SPA** frontend, **two auxiliary Python media-generation microservices** (audio + video pipelines invoked as subprocesses), a **Solidity smart contract** for certificate anchoring, and a **Neo4j graph database** layer for knowledge-graph / roadmap analytics alongside the primary MongoDB store.

---

## 2. Tech Stack

### Backend (`/backend`)
- **Language:** JavaScript (Node.js, ES Modules — `"type": "module"`)
- **Framework:** Express **5** (`express@^5.2.1`)
- **Primary Database:** MongoDB via **Mongoose 9** (`mongoose@^9.3.1`), DB name `recursion` (`src/constants.js`)
- **Secondary Database:** **Neo4j** graph DB (`neo4j-driver@^5.28.3`) for knowledge-graph insights & roadmaps (`src/config/neo4j.js`)
- **Realtime:** **Socket.IO 4** (`socket.io@^4.7.2`) for video-call signaling (`src/utils/videoCallSocket.js`)
- **Auth:** **JWT** (`jsonwebtoken@^9.0.3`) access + refresh tokens; passwords hashed with **bcryptjs** (model also pulls in `bcrypt`)
- **AI / LLM providers:**
  - **Groq SDK** (`groq-sdk`) — primary LLM (Llama 3.x) for tutor, quizzes, flashcards, study plans, notes/doubt analysis; also **Whisper** transcription (`whisper-large-v3-turbo`)
  - **Google Generative AI** (`@google/generative-ai`) — Gemini for job-recommendation ranking
  - **OpenAI SDK** (`openai`) — present as a dependency
- **Blockchain:** **ethers v6** (`ethers@^6.15.0`) + **Hardhat 3** (dev) to deploy/interact with `CertificateRegistry.sol`
- **Video calls:** **Twilio Video** (`twilio@^4.20.0`) — token generation + room management
- **Media / files:** **Cloudinary** (uploads), **Multer** (multipart), **pdf-parse** (PDF text extraction), **qrcode** (certificate QR), **uuid**
- **Email / messaging:** **Nodemailer** (SMTP) + **Green API** (WhatsApp, via `fetch`)
- **Build / tooling:** `nodemon` (dev), npm scripts for seeding and Hardhat

### Frontend (`/frontend`)
- **Language:** TypeScript (`typescript@^5.8.3`)
- **Framework / build:** **React 18** + **Vite 5** (`@vitejs/plugin-react-swc`)
- **Routing:** `react-router-dom@^6`
- **Data fetching / state:** `@tanstack/react-query@^5`
- **UI:** **shadcn/ui** pattern over **Radix UI** primitives + **Tailwind CSS 3** + `framer-motion`, `lucide-react`, `recharts`
- **Forms / validation:** `react-hook-form` + `zod` + `@hookform/resolvers`
- **Realtime collaboration:** **Liveblocks** (`@liveblocks/client`, `@liveblocks/react`) — whiteboard/collab
- **Code editor:** **Monaco** (`@monaco-editor/react`) for the in-browser code editor
- **CV / attention tracking:** **MediaPipe Tasks Vision** (`@mediapipe/tasks-vision`) — face/attention proctoring in-browser
- **Video:** `twilio-video`, `socket.io-client`
- **Graph viz:** `react-force-graph-2d` (knowledge graph / progress graph)
- **PDF / QR:** `jspdf`, `qrcode.react`
- **Testing:** **Vitest** + **Testing Library** + **Playwright** (`@playwright/test`)

### Python media pipelines (`/backend/audio_pipeline`, `/backend/video_pipeline`)
- **Audio pipeline:** FastAPI/uvicorn scaffold, **Groq** for scripting, **gTTS** TTS, `pdfplumber` for PDF
- **Video pipeline:** **Groq** scripting, **edge-tts** TTS, **Pollinations.ai** (free) image generation, **MoviePy/ffmpeg** assembly, `PyMuPDF`
- Invoked from Node via `pipeline_bridge.py` (subprocess), which prints a `__PIPELINE_JSON__{...}` marker line parsed by the backend

### Root
- `attention_tracker.py` — standalone CV attention-tracking script
- Smart contract: `backend/contracts/CertificateRegistry.sol` (Solidity `^0.8.24`)

---

## 3. Project Structure

```
Recursion/
├── attention_tracker.py            # CV attention proctoring (standalone)
├── backend/
│   ├── contracts/CertificateRegistry.sol   # On-chain certificate registry
│   ├── hardhat.config.js                   # Hardhat config (deploy/verify)
│   ├── scripts/deploy.js, deploy-local.js  # Contract deployment
│   ├── pipeline_bridge.py                  # Node→Python pipeline launcher
│   ├── audio_pipeline/                     # Python: PDF/topic → narrated audio
│   ├── video_pipeline/                     # Python: PDF/topic → narrated video
│   ├── pipeline_outputs/                   # Generated audio/video served statically
│   ├── uploads/                            # Multer temp uploads
│   ├── postman/                            # Postman collection
│   └── src/
│       ├── index.js                # Entry: DB connect, HTTP+Socket.IO server boot
│       ├── app.js                  # Express app: CORS, middleware, route mounting, error handler
│       ├── constants.js            # DB_NAME = "recursion"
│       ├── config/neo4j.js         # Neo4j driver + session factory
│       ├── db/db.js                # Mongoose connection
│       ├── controllers/            # Route handlers (one per domain)
│       ├── routes/                 # Express routers
│       ├── models/                 # Mongoose schemas
│       ├── services/               # Business logic / AI agents / integrations
│       ├── middlewares/            # auth (JWT), role guards, multer
│       └── utils/                  # ApiError, ApiResponse, asyncHandler, hash, qrcode,
│                                   #   cloudinary, videoCallSocket, seed scripts
└── frontend/
    └── src/
        ├── App.tsx                 # Route table (role-protected routes)
        ├── auth/                   # AuthContext, ProtectedRoute
        ├── pages/                  # student/, instructor/, admin/, auth/ page trees
        ├── components/             # dashboard/, instructor/, roadmap/, ui/ (shadcn)
        ├── lib/                    # Typed API clients (api-client.ts + per-domain)
        ├── hooks/                  # useCourseBuilder, use-toast, use-mobile
        └── liveblocks.config.ts    # Liveblocks realtime config
```

### Backend module map (by folder)
- **`controllers/`** — `user`, `course.controlller` (sic), `module.controller`, `lesson.controller`, `ai`, `quizBank`, `enrollment`, `progress`, `discussion`, `review`, `notification`, `admin`, `certificate`, `graph`, `videoCall`, `pipeline`, `courseGeneration`
- **`services/`** — `agentOrchestrator`, `adaptiveLearning`, `adaptiveQuiz`, `aiTutor`, `studyPlanAgent`, `badgeAgent`, `flashCardAgent`, `gemini`, `groq`, `jobRecommendation`, `blockchainCertificate`, `mailer`, `whatsapp`
- **`models/`** — 20+ Mongoose models (see §5)

---

## 4. Important Controllers / Routes

Route mounting is defined in `src/app.js`. Most v1 routes are under `/api/v1`. Auth guard = `verifyJWT` (`middlewares/auth.middleware.js`); role guards = `isInstructor` / `isAdmin` (`middlewares/role.midddleware.js`, re-exported via `role.middleware.js`).

### 4.1 Users — `/api/v1/users` (`routes/user.routes.js` → `controllers/user.controller.js`)
| Method | Path | Handler | Middleware | Description |
|---|---|---|---|---|
| POST | `/register` | `registerUser` | `upload.fields(avatar, coverImage)` | Create user; uploads avatar/cover to Cloudinary; default role `student` |
| POST | `/login` | `loginUser` | — | Validates password, issues access+refresh JWT cookies |
| POST | `/refresh-token` | `refreshAccessToken` | — | Rotates access token from refresh token |
| GET | `/profile/:username` | `getUserProfile` | — (public) | Public profile page |
| POST | `/logout` | `logoutUser` | `verifyJWT` | Clears refresh token + cookies |
| POST | `/change-password` | `changeCurrentPassword` | `verifyJWT` | |
| GET | `/current-user` | `getCurrentUser` | `verifyJWT` | |
| PATCH | `/update-account` | `updateUserAccountDetails` | `verifyJWT` | |
| PATCH | `/avatar` | `updateUserAvatar` | `verifyJWT`, `upload.single` | |
| PATCH | `/cover-image` | `updateUserCoverImage` | `verifyJWT`, `upload.single` | |
| GET | `/my-learning` | `getMyLearning` | `verifyJWT` | Enrolled courses summary |
| GET | `/my-badges` | `getMyBadges` | `verifyJWT` | |
| GET | `/directory` | `getUserDirectory` | `verifyJWT` | User directory (e.g., for live-call targets) |
| GET | `/:userId` | `getUserById` | `verifyJWT`, `isAdmin` | Admin view of any user |

### 4.2 Courses — `/api/v1/courses` (`routes/course.routes.js` → `controllers/course.controlller.js`) + course-generation routes
Note: the `courseRouter` is exported from `controllers/admin.controller.js` (lines ~290) and mounted as `course.routes.js`.
| Method | Path | Handler | Middleware | Description |
|---|---|---|---|---|
| GET | `/` | `getAllCourses` | — | List published courses |
| POST | `/` | `createCourse` | `verifyJWT`, `isInstructor`, `upload.single(thumbnail)` | Create course (draft) |
| GET | `/my-courses` | `getMyCoursesAsInstructor` | `verifyJWT`, `isInstructor` | |
| POST | `/uploads/lesson-video` | `uploadDraftLessonVideo` | `verifyJWT`, `isInstructor`, `upload.single(video)` | |
| GET | `/:courseId` | `getCourse` | — | |
| PATCH | `/:courseId` | `updateCourse` | `verifyJWT`, `isInstructor`, `upload.single(thumbnail)` | |
| DELETE | `/:courseId` | `deleteCourse` | `verifyJWT`, `isInstructor` | |
| PATCH | `/:courseId/publish` & `/submit` | `submitForApproval` | `verifyJWT`, `isInstructor` | Submit course for admin approval |
| POST | `/:courseId/generate-structure` | `generateCourseStructure` | — | AI/template course tree generation |
| POST | `/:courseId/save-structure` | `saveCourseStructure` | — | Persist modules/topics/subtopics |
| GET | `/:courseId/structure` | `getCourseStructure` | — | Full tree (modules→topics→subtopics) |

### 4.3 Modules — `/api/v1/modules` (`routes/module.routes.js`)
`POST /` create, `PATCH /reorder`, `GET /course/:courseId`, `PATCH /:moduleId`, `DELETE /:moduleId` — all writes guarded by `verifyJWT + isInstructor`.

### 4.4 Lessons — `/api/v1/lessons` (`routes/lesson.routes.js`)
`POST /` (video upload), `GET /module/:moduleId`, `GET /:lessonId` (`verifyJWT`), `PATCH /:lessonId`, `DELETE /:lessonId`, `PATCH /:lessonId/resource` — writes guarded by `isInstructor`.

### 4.5 AI — `/api/v1/ai` (`routes/ai.routes.js` → `controllers/ai.controller.js`) — **entire router uses `verifyJWT`**
| Method | Path | Handler | Description |
|---|---|---|---|
| GET | `/dashboard/:courseId` | `getDashboardContext` | Runs the **agent orchestrator** (next lesson, streak, flashcards, schedule health, notifications) |
| GET | `/adaptive/:courseId` | `getAdaptiveSnapshot` | Mastery/engagement snapshot + LLM coaching |
| POST | `/tutor/chat` | `tutorChat` | Socratic AI tutor (Groq), persists chat session |
| POST | `/tutor/flag` | `flagChat` | Thumbs-down → flags chat for admin |
| GET | `/tutor/history/:courseId` | `tutorHistory` | |
| GET | `/quiz/:lessonId` | `getQuiz` | Get/generate adaptive quiz (answers hidden) |
| POST | `/quiz/submit` | `submitQuiz` | Grade + reveal explanations + next-difficulty |
| POST | `/quiz/regenerate` | `regenQuiz` | Regenerate quiz (instructor) |
| POST | `/flashcards/generate` | `generateCards` | SM-2 flashcards from transcript |
| GET | `/flashcards/due/:courseId` | `getDueCards` | Cards due today |
| POST | `/flashcards/review` | `reviewCard` | SM-2 update from quality 0–5 |
| POST | `/study-plan/create` | `createPlan` | LLM-built day-by-day plan |
| POST | `/study-plan/replan` | `replanStudy` | Rebuild remaining schedule |
| GET | `/jobs/trending` | `getTrendingJobs` | Remotive + RemoteOK aggregation |
| POST | `/jobs/finder` | `findJobs` | Gemini ranks jobs vs. earned certificates |
| GET | `/transcript/:lessonId` | `getLessonTranscript` | Whisper transcription (cached 6h, enrollment-gated) |
| POST | `/notes/analyze` | `analyzeNotes` | Notes → summary/flashcards/concepts |
| POST | `/doubt/analyze` | `analyzeDoubt` | Timestamped doubt → explanation + prerequisite |

### 4.6 Quizzes (proctored exam banks) — `/api/v1/quizzes` (`routes/quiz.routes.js` → `controllers/quizBank.controller.js`) — `verifyJWT` on all
`GET /my` (instructor), `POST /manual` (instructor), `POST /generate` (instructor, PDF upload), `PATCH /:quizId/publish` (instructor), `GET /available`, `POST /:quizId/start`, `POST /:quizId/submit`, `GET /attempts/:attemptId/report`.

### 4.7 Other domains — mounted from `routes/other.routes.js`
- **Enrollments** `/api/v1/enrollments`: `POST /`, `GET /my`, `GET /status/:courseId`, `GET /course/:courseId/students`, `DELETE /:courseId`
- **Progress** `/api/v1/progress`: `POST /lesson/:lessonId/complete`, `PATCH /lesson/:lessonId/watch`, `PATCH /lesson/:lessonId/attention`, `GET /course/:courseId`, `GET /student/:studentId/course/:courseId`
- **Discussions** `/api/v1/discussions`: `POST /`, `GET /:courseId`, `GET /replies/:postId`, `PATCH /:postId/upvote`, `PATCH /:postId/pin`, `DELETE /:postId`
- **Reviews** `/api/v1/reviews`: `POST /`, `GET /:courseId`, `DELETE /:courseId`
- **Notifications** `/api/v1/notifications`: `GET /`, `PATCH /read-all`, `PATCH /:notificationId/read`, `DELETE /:notificationId`
- **Admin** `/api/v1/admin` (router-level `verifyJWT + isAdmin`): `GET /stats`, `GET /users`, `PATCH /users/:userId/role`, `GET /courses`, `GET /courses/pending`, `PATCH /courses/:courseId/approve`, `PATCH /courses/:courseId/unpublish`, `GET /ai/flagged-chats`, `GET /ai/usage`

### 4.8 Certificates — mounted at both `/api` and `/api/v1` (`routes/certificate.routes.js`)
`POST /verify-completion/:courseId`, `POST /certificate/issue`, `GET /certificate/verify/:hash`, `GET /certificate/course/:courseId`. **Note:** these are *not* JWT-guarded; `resolveUser()` accepts `userId`/`userEmail` in body/query as a fallback.

### 4.9 Graph (Neo4j) — `/api` (`routes/graph.routes.js`)
`GET /graph` (knowledge graph), `GET /course/:id`, `GET /neo4j/insights` (mastery, ready-to-learn, decaying concepts, heatmap, roadmaps, study-debt), `GET /student-progress` (`verifyJWT`, built from Mongo).

### 4.10 Video calls — mounted at `/api/v1/video`, `/api/video`, `/video` (`routes/videoCall.routes.js`)
`GET /rooms`, `POST /generate-token` (Twilio token), `GET /room/:room/participants`, `POST /end-room`. Plus **Socket.IO** signaling events in `utils/videoCallSocket.js` (`user:register`, `call:initiate`, `call:accept`, `call:reject`, `call:end`, `call:chat`).

### 4.11 Notes — `/api/v1/notes` (`routes/notes.routes.js`)
CRUD for session notes (`POST /save`, `GET /:studentId`, `GET /detail/:noteId`, `PUT /:noteId`, `DELETE /:noteId`). Uses a non-`ApiResponse` `{ ok, ... }` shape.

### 4.12 Mailer / WhatsApp — `/api/...` (`routes/mailer.routes.js`)
`POST /v1/mailer/send` (email/OTP), `POST /v1/mailer/send-whatsapp`, `POST /v1/mailer/send-live-session-invite` — all `verifyJWT + isInstructor`.

### 4.13 Media pipeline — `/api/v1/pipeline` (`routes/pipeline.routes.js`, `verifyJWT`)
`POST /generate` (PDF upload → spawns Python audio/video pipeline, returns `jobId`), `GET /status/:jobId` (poll job progress from in-memory `pipelineJobs` map).

---

## 5. Database Models / Entities (MongoDB / Mongoose)

All models live in `src/models/`. `_id` is an ObjectId PK on every collection; `timestamps: true` adds `createdAt`/`updatedAt` unless noted.

### `User` (`user.model.js`)
`username*` (unique, indexed), `email*` (unique), `fullname*` (indexed), `avatar`, `coverImage`, `role` (enum `student|instructor|admin`, default `student`), `bio`, `password*` (bcrypt-hashed via `pre("save")`), `refreshToken`.
- Methods: `isPasswordCorrect`, `generateAccessToken` (embeds `_id, username, email, fullname, role`), `generateRefreshToken`.

### `Course` (`course.model.js`)
`title*` (idx), `description*`, `instructor*`→User, `thumbnail`, `category*` (idx), `tags[]`, `price` (0=free), `status` (`draft|published|archived`), `isApproved` (admin gate), `totalDuration`, `enrollmentCount`, `averageRating` (0–5), `totalReviews`, `level` (`beginner|intermediate|advanced`), `language`.

### `Module` (`module.model.js`)
`title*`, `description`, `course*`→Course, `order*`, `isLocked`, `prerequisiteModule`→Module. **Unique index** `{course, order}`.

### `Topic` (`topic.model.js`) / `Subtopic` (`subtopic.model.js`)
Curriculum tree below modules. `title*`, `description`, `module*`/`topic*`, `course*`, `order*`, `difficulty` (`easy|medium|hard`), `learningOutcomes[]` (with Bloom level enum), `prerequisites[]` (self-ref), `alternatePaths[]` (conditional branching), `estimatedDuration`. Subtopic adds `isOptional`. Unique `{module, order}` / `{topic, order}`.

### `Lesson` (`lesson.model.js`)
`title*`, `module*`, `course*`, `videoUrl*`, `duration` (sec), `order*`, `transcript` (Whisper), `summary` (AI), `resources[]` (sub-schema: title/url/type), `isFree`, `description`. **Unique** `{module, order}`.

### `Content` (`content.model.js`)
Polymorphic content attachable to topic/subtopic/lesson: `title*`, `type` (`video|pdf|notes|link|code|interactive|quiz`), `url*`, `course*`, optional `topic|subtopic|lesson`, `duration`, `tags[]`, `order`, `isPublished`, `transcript`, `thumbnail`, `sizeInBytes`. `pre("save")` requires at least one parent.

### `Enrollment` (`enrollment.model.js`)
`student*`→User, `course*`→Course, `enrolledAt`, `completedAt`, `isCompleted`, `certificateUrl`, `studyGoal`, `deadline`, `completionPercentage` (0–100). **Unique** `{student, course}`.

### `Progress` (`progress.model.js`)
`student*`, `course*`, `lesson*`, `isCompleted`, `watchedDuration` (sec), `completedAt`, `attentionScore` (0–100, CV proctoring), `lastWatchedAt`. **Unique** `{student, lesson}`; index `{student, course}`.

### `Quiz` (`quiz.model.js`) — adaptive per-lesson quiz
`lesson*` (**unique**), `course*`, `questions[]` (each: `text`, `options[4]`, `correctIndex` 0–3, `difficulty`, `explanation`), `passingScore` (default 60), `isAIGenerated`, `currentDifficulty`.

### `QuizAttempt` (`quizattempt.model.js`)
`student*`, `quiz*`, `lesson`, `course`, `quizBank`, `assignedQuestions[]`, `answers[]` (questionId, selectedIndex, answerText, isCorrect, timeSpentSeconds), `score` (0–100), `isPassed`, `difficulty`, `attemptNumber`, `timeTaken`, `warningCount`, `activityLogs[]` (proctoring events: copy/paste/selection/click/fullscreen_exit/visibility_hidden/context_menu), `isTerminatedForCheating`, `startedAt`, `submittedAt`. Index `{student, quiz}`.

### `QuizBank` (`quizBank.model.js`) — instructor exam banks
`title*`, `instructor*`, `course`, `lesson`, `sourceType` (`manual|auto|prompt|pdf|topic`), `generationPrompt`, `questions[]` (type `mcq|brief|descriptive`, options, correctIndex, expectedAnswer, marks, difficulty), `distribution` (per-student question counts by type & difficulty, `strategy` `balanced|random`), `isPublished`, `maxWarnings` (default 3).

### `QuizAttemptReport` (`quizAttemptReport.model.js`)
`attempt*` (unique)→QuizAttempt, `student*`, `status` (`pending|ready|failed`), `telemetry` (Mixed), `report` (Mixed, AI-generated), `error`, `generatedAt`. Backs the async background report generation.

### `Flashcard` (`flashCard.model.js`)
`student*`, `lesson*`, `course*`, `question*`, `answer*`, `isAIGenerated`, **SM-2 fields:** `nextReviewAt`, `reviewCount`, `easeFactor` (default 2.5, min 1.3), `interval` (days), `lastReviewedAt`. Index `{student, nextReviewAt}`.

### `StudyPlan` (`studyPlan.model.js`)
`student*`, `course*`, `goalText*`, `deadline*`, `dailyTasks[]` (date, lessons[], estimatedMins, isCompleted), `lastReplanAt`, `replanCount`, `isActive`. **Unique** `{student, course}`.

### `Badge` (`badge.model.js`)
`student*`, `type` (enum: `first_quiz, quiz_master, streak_7, streak_30, module_complete, course_complete, fast_learner, top_performer, helpful_peer`), `course`, `awardedAt`, `metadata` (Mixed). Index `{student}`.

### `AITutorChat` (`Aitutorchat.model.js`)
`student*`, `course*`, `lesson`, `messages[]` (role `user|assistant`, content, createdAt), `sessionId*` (unique), `isFlagged`, `flagReason`. Index `{student, course}`.

### `Discussion` (`discussion.model.js`)
`course*`, `lesson`, `author*`, `content*`, `parentPost`→Discussion (threading), `upvotes[]`→User, `isPinned`, `isDeleted` (soft delete). Index `{course, lesson}`.

### `Review` (`review.model.js`)
`student*`, `course*`, `rating*` (1–5), `comment`, `isFlagged`. **Unique** `{student, course}`. `post("save")` hook recomputes `Course.averageRating` & `totalReviews`.

### `Notification` (`notification.model.js`)
`recipient*`, `type` (enum: quiz_due, plan_replan, plan_reminder, badge_earned, announcement, course_approved, course_rejected, enrollment, certificate), `message*`, `isRead`, `link`, `relatedCourse`. Index `{recipient, isRead}`.

### `Certificate` (`certificate.model.js`)
`userId*`, `courseId*`, `issuedAt*`, `hash*` (unique — SHA hash chain), `previousHash` (default `"GENESIS"` — blockchain-style linkage), `qrCodeUrl*`, plus on-chain proof: `onChainTxHash`, `onChainBlockNumber`, `onChainContractAddress`, `onChainChainId`, `onChainIssuerAddress`, `onChainExplorerUrl`, `onChainRecipientIdHash`. **Unique** `{userId, courseId}`.

### `Call` (`call.model.js`)
`callerId*`, `callerName*`, `callerRole`, `calleeId*`, `calleeName`, `calleeRole`, `roomName*`, `status` (`ringing|accepted|rejected|ended`), `startedAt`, `endedAt`, `durationSeconds`.

### `Notes` (`notes.model.js`)
`studentId*`→User, `callId`, `roomName`, `title`, `content*`, `sessionDate`. Session/class notes.

### Relationship summary
- **User 1—N Course** (instructor), **User N—N Course** via **Enrollment**, **User N—N Course** via **Review** (1 each).
- **Course 1—N Module 1—N Topic 1—N Subtopic**; **Course/Module 1—N Lesson**; **Content** attaches to Topic/Subtopic/Lesson.
- **Lesson 1—1 Quiz**; **Quiz 1—N QuizAttempt**; **QuizBank 1—N QuizAttempt**; **QuizAttempt 1—1 QuizAttemptReport**.
- **Student 1—N Progress / Flashcard / Badge / Notification / AITutorChat / StudyPlan**.
- **Discussion** self-referential (thread tree). **Certificate** forms a hash chain (`previousHash` → previous cert's `hash`).
- **Neo4j** mirrors a knowledge graph (Category→Course→Module→Topic→Subtopic→Lesson, plus Student-HAS_MASTERY→Concept, Roadmap-INCLUDES_COURSE, PREREQUISITE_FOR).

---

## 6. Business Logic & Core Features

### A) Course authoring & approval workflow
- Files: `controllers/course.controlller.js`, `controllers/admin.controller.js`, `controllers/courseGeneration.controller.js`, `models/Course|Module|Topic|Subtopic|Lesson`.
- Instructor creates a draft → builds structure (AI/template `generateTemplateStructure` or manual) → `submitForApproval` sets pending → admin `approveCourse` sets `isApproved=true`, `status="published"`, and notifies the instructor. Enrollment is blocked unless `published && isApproved` (`enrollment.controller.js`).

### B) Enrollment, progress & anti-cheat watch tracking
- Files: `controllers/enrollment.controller.js`, `controllers/progress.controller.js`.
- `enrollInCourse` resolves a course by ObjectId *or* fuzzy title regex, prevents duplicates, increments `enrollmentCount`.
- `updateWatchTime` (called ~every 30s) **caps watch increments** against elapsed wall-clock time (`maxAllowedIncrement = ceil(elapsed*1.35)+1`) to defeat skip-to-end/forged payloads; auto-completes at **90% watched** (`COMPLETION_THRESHOLD`). `recalculateCompletion` recomputes `Enrollment.completionPercentage`/`isCompleted`.
- `saveAttentionScore` stores the MediaPipe-derived attention (0–100) per lesson, later feeding adaptive difficulty.

### C) Agentic dashboard orchestrator
- File: `services/agentOrchestrator.service.js` (`runDashboardAgents`).
- Sequenced "agents": **Context Loader** (enrollment, completed lessons, study plan, recent attempts, streak, avg score) → parallel **Next-Lesson Picker**, **Due-Flashcards Checker**, **Schedule-Health Checker** (auto-triggers replan if >1 day behind) → **Adaptive snapshot** → fire-and-forget **Badge Agent** → **Notification Generator** (streak milestones, due cards, replans). Returns a unified dashboard payload.

### D) Adaptive learning engine
- File: `services/adaptiveLearning.service.js`.
- Computes per-lesson **mastery** (completion 40 + watch ratio 35 + best quiz 25, + flashcard ease boost) and **engagement** (attention-derived). Derives quiz difficulty via `analyzePerformance` (avg of last 3 attempts; eased when engagement <45 or ≥2 weak topics). Builds a **personalized path** (resume / mastery-gap review / syllabus-next) and calls Groq for an LLM **coaching brief** (`synthesizeAdaptiveCoaching`) with graceful `fallbackCoaching`.

### E) AI Tutor (Socratic chat)
- File: `services/aiTutor.service.js`.
- `gatherLearnerContext` aggregates progress, weak areas (low attention/quiz), recent mistakes, enrolled-course snapshot, performance trend. `buildSystemPrompt` injects this into a persona prompt enforcing personalization, 2 next-steps, Socratic guidance, ≤140 words, a follow-up question. Persists sessions in `AITutorChat`; supports thumbs-down flagging for admin moderation.

### F) Adaptive quizzes (per-lesson) + proctored exam banks
- Files: `services/adaptiveQuiz.service.js`, `controllers/quizBank.controller.js`.
- Per-lesson: `getOrCreateQuiz` generates 5 MCQs from the transcript via Groq at student-adapted difficulty, **hides `correctIndex`** until submission; `submitQuizAttempt` grades, stores the attempt, and suggests next difficulty.
- Exam banks: instructor generates a bank (manual / prompt / topic / **PDF via `pdf-parse`**). `pickQuestionsForStudent` deterministically samples a per-student subset by type/difficulty distribution. Frontend reports proctoring `activityLogs` + `warningCount`; submission **zeroes the score and flags `isTerminatedForCheating`** once warnings ≥ `maxWarnings`. A background job (`queueAttemptReportGeneration` via `setImmediate`) builds an LLM telemetry **report** (`QuizAttemptReport`).

### G) Spaced-repetition flashcards (SM-2)
- File: `services/flashCardAgent.service.js`.
- Generates 8 cards from a lesson transcript (Groq). `reviewFlashcard` implements **SM-2**: interval progression 1→6→`interval*easeFactor`, ease-factor adjustment, reset on quality <3. `getDueFlashcards` returns cards with `nextReviewAt <= now`.

### H) Study plan agent
- File: `services/studyPlanAgent.service.js`.
- `createStudyPlan` asks Groq to build a day-by-day schedule from goal+deadline+remaining lessons. `runStudyPlanAgent` deterministically rebuilds the remaining schedule when the student falls behind and sends a `plan_replan` notification.

### I) Gamification (badges)
- File: `services/badgeAgent.service.js`.
- `BADGE_CONDITIONS` map (first_quiz, streak_7/30, course_complete, quiz_master) checked non-blocking after dashboard load; awards `Badge` + `badge_earned` notification, idempotent via `Badge.exists`.

### J) Blockchain-verified certificates
- Files: `controllers/certificate.controller.js`, `services/blockchainCertificate.service.js`, `contracts/CertificateRegistry.sol`, `utils/hash.js`, `utils/qrcode.js`.
- `computeEligibility` requires **all lectures complete AND ≥80% watch ratio**. `issueCertificate` builds a deterministic `hash`, links `previousHash` to the last cert (hash chain), generates a QR verification URL, and **anchors on-chain** via `issueCertificateOnChain` (ethers → `CertificateRegistry`). `verifyCertificate` recomputes the hash AND checks on-chain existence/revocation/previousHash for tamper-evidence.

### K) Job recommendations
- File: `services/jobRecommendation.service.js`.
- Aggregates **Remotive** + **RemoteOK** APIs, extracts skills via a keyword list, dedupes/filters, then **Gemini** (`rankJobsWithGemini`) ranks against the learner's earned-certificate skills and returns match scores + skill gaps.

### L) Live video classes (Twilio + Socket.IO)
- Files: `controllers/videoCall.controller.js`, `utils/videoCallSocket.js`, `models/Call`, `models/Notes`.
- Twilio Video access-token minting (with credential-consistency validation), room participant/listing/end APIs, and a full Socket.IO call-signaling lifecycle (register → initiate → ring → accept/reject → end → in-call chat). Instructors invite students by email/WhatsApp with a room code (`mailer.routes.js`).

### M) AI media generation pipelines (PDF/topic → audio or video lesson)
- Files: `controllers/pipeline.controller.js`, `pipeline_bridge.py`, `audio_pipeline/`, `video_pipeline/`.
- `runLearningPipeline` spawns the Python bridge as a subprocess, streams stdout to derive **progress stages**, and parses the `__PIPELINE_JSON__` marker. Jobs are tracked in an in-memory map and polled via `/status/:jobId`. Output media is served statically from `/pipeline-outputs`.

### N) Knowledge graph & analytics (Neo4j)
- File: `controllers/graph.controller.js`.
- `getGraph` returns a force-graph node/link set (with APOC fallback). `getNeo4jInsights` runs Cypher for mastery, ready-to-learn (prereq-satisfied), decaying concepts, domain heatmap, roadmap progress, role skill-gaps, and a computed **study-debt** score. `getStudentProgressGraph` builds a color-coded course→module→lesson completion graph from MongoDB.

---

## 7. Authentication & Authorization

- **Mechanism:** stateless **JWT** with separate **access** and **refresh** tokens (`models/user.model.js` `generateAccessToken`/`generateRefreshToken`). Tokens are set as **httpOnly cookies** on login (`cookieOptions = { httpOnly: true, secure: true }`) and also returned in the body so the SPA can send `Authorization: Bearer` (`frontend/src/lib/api-client.ts`).
- **`verifyJWT`** (`middlewares/auth.middleware.js`) reads the token from `cookies.accessToken` or the `Authorization` header, verifies with `ACCESS_TOKEN_SECRET`, loads the user (minus password/refreshToken) onto `req.user`. All failures normalize to `ApiError(401)`.
- **Passwords:** hashed with bcrypt in a Mongoose `pre("save")` hook; compared via `isPasswordCorrect`.
- **RBAC:** three roles — `student | instructor | admin`. `isInstructor` allows instructor **or** admin; `isAdmin` allows admin only (`role.midddleware.js`).
- **Protected route examples:** all `/api/v1/ai/*`, all `/api/v1/quizzes/*`, all writes on courses/modules/lessons (`isInstructor`), the entire `/api/v1/admin/*` router (`verifyJWT + isAdmin`), enrollment/progress/discussion/review/notification routes.
- **Frontend RBAC:** `ProtectedRoute` with `allowedRoles` gates page trees in `App.tsx` (`/student/*`, `/instructor/*`, `/admin/*`).
- **Gaps worth noting (interview-honest):** certificate routes and the course-generation routes are **not** JWT-guarded (certificate uses a `userId`/`userEmail` fallback in `resolveUser`); notes routes are public CRUD.

---

## 8. APIs & Integrations

| Integration | Purpose | Where |
|---|---|---|
| **Groq** (Llama 3.x + Whisper) | Tutor, quizzes, flashcards, study plans, notes/doubt analysis, transcription | `services/groq.service.js` (+ most agents) |
| **Google Gemini** | Job-recommendation ranking | `services/gemini.service.js` |
| **OpenAI SDK** | Present as dependency | `package.json` |
| **Twilio Video** | Live class tokens & room mgmt | `controllers/videoCall.controller.js` |
| **Cloudinary** | Avatar/thumbnail/video uploads | `utils/cloudinary.js` |
| **Nodemailer (SMTP)** | Email + OTP + session invites | `services/mailer.service.js` |
| **Green API** | WhatsApp messaging | `services/whatsapp.service.js` |
| **Remotive API** + **RemoteOK API** | Job aggregation | `services/jobRecommendation.service.js` |
| **Pollinations.ai** | Free image generation (video pipeline) | `video_pipeline/` |
| **edge-tts / gTTS** | Text-to-speech (pipelines) | `audio_pipeline/`, `video_pipeline/` |
| **Ethereum / EVM RPC** | On-chain certificate anchoring (ethers + Hardhat) | `services/blockchainCertificate.service.js` |
| **Neo4j** | Knowledge graph + analytics | `config/neo4j.js`, `controllers/graph.controller.js` |
| **Liveblocks** | Realtime collaborative whiteboard | `frontend/src/liveblocks.config.ts` |
| **MediaPipe Tasks Vision** | Browser CV attention proctoring | frontend + `attention_tracker.py` |

- **Webhooks:** No inbound third-party webhooks are implemented. Realtime is via Socket.IO; on-chain events (`CertificateIssued`/`CertificateRevoked`) are emitted by the contract but not consumed via a listener.

---

## 9. Key Design Patterns Used

- **MVC-ish layered architecture:** Routes → Controllers → Services → Models.
- **Service layer / Agent pattern:** Discrete "agents" (`agentOrchestrator`, `studyPlanAgent`, `badgeAgent`, `flashCardAgent`, `aiTutor`, `adaptiveQuiz`) encapsulate business workflows; an **orchestrator** composes them.
- **Middleware chain:** `verifyJWT` → role guard → `multer` → controller; centralized error-handling middleware in `app.js`.
- **Higher-order wrapper (decorator):** `asyncHandler` wraps async controllers to funnel errors to the error middleware.
- **Standardized response/error envelopes:** `ApiResponse` and `ApiError` classes for consistent `{ success, statusCode, data, message }`.
- **Lazy singletons:** Groq, Gemini, Nodemailer transporter, and the blockchain client are lazily instantiated and cached (so the app boots even with missing optional env vars).
- **Strategy pattern:** quiz-bank `distribution.strategy` (`balanced` vs `random`); deterministic per-student question sampling.
- **Repository-ish data access:** Mongoose models + aggregation pipelines (admin stats, adaptive flashcard ease).
- **Background job / queue:** `setImmediate` + status doc (`QuizAttemptReport`) and an in-memory `pipelineJobs` map (poll-based jobs).
- **Bridge/adapter:** `pipeline_bridge.py` adapts Python pipelines to Node via a stdout JSON marker protocol.
- **Hash-chain / blockchain anchoring:** certificate `previousHash` linkage + on-chain registry for tamper evidence.
- **Graceful degradation / fallback chains:** Groq model-candidate fallback (`GROQ_MODEL_CANDIDATES`), Neo4j APOC fallback query, LLM `fallbackCoaching`.

---

## 10. Configuration & Environment

### Backend environment variables (names only)
- **Server/CORS:** `PORT`, `CORS_ORIGIN` (comma-sep), `DNS_SERVERS`, `NODE_ENV`
- **Mongo:** `MONGO_URI` (DB name appended from `constants.js`)
- **JWT:** `ACCESS_TOKEN_SECRET`, `ACCESS_TOKEN_EXPIRY`, `REFRESH_TOKEN_SECRET`, `REFRESH_TOKEN_EXPIRY`
- **Neo4j:** `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`, `NEO4J_DATABASE`
- **Groq:** `GROQ_API_KEY`, `GROQ_CHAT_MODEL`, `GROQ_TUTOR_MODEL`, `GROQ_QUIZ_MODEL`, `GROQ_FLASHCARD_MODEL`, `GROQ_STUDYPLAN_MODEL`, `GROQ_ADAPTIVE_MODEL`, `GROQ_NOTES_MODEL`, `GROQ_DOUBT_MODEL`, `GROQ_QUIZ_REPORT_MODEL`, `GROQ_TRANSCRIPTION_MODEL`
- **Gemini:** `GEMINI_API_KEY`, `GEMINI_MODEL`
- **Cloudinary:** `CLOUDINARY_*` (cloud name/key/secret)
- **Twilio:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_API_KEY`, `TWILIO_API_SECRET`
- **Email (SMTP):** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `MAIL_FROM`
- **WhatsApp:** `GREEN_API_INSTANCE_ID`, `GREEN_API_TOKEN`
- **Blockchain:** `BLOCKCHAIN_REQUIRED`, `BLOCKCHAIN_RPC_URL`, `BLOCKCHAIN_PRIVATE_KEY`, `BLOCKCHAIN_CONTRACT_ADDRESS`, `BLOCKCHAIN_CHAIN_ID`, `BLOCKCHAIN_EXPLORER_BASE_URL`
- **Certificates / frontend:** `CERT_VERIFY_BASE_URL`, `FRONTEND_URL`
- **Pipelines:** `PYTHON_BIN`, `OUTPUT_DIR` (+ `GROQ_API_KEY` reused by Python)

### Frontend environment variables
- `VITE_API_BASE_URL` (defaults to `http://localhost:8000`), Liveblocks public key.

### Config files
- `backend/src/constants.js` — `DB_NAME`
- `backend/src/app.js` — CORS allow-list, body limits (16kb), static mounts (`/public`, `/pipeline-outputs`), route mounting, global error handler
- `backend/hardhat.config.js` — Solidity/network config for contract compile/deploy
- `frontend/vite.config.ts`, `tailwind.config.ts`, `tsconfig*.json`, `eslint.config.js`, `playwright.config.ts`, `vitest` config
- Docs: `ARCHITECTURE.md`, `INTEGRATION_GUIDE.md`, `SETUP_VIDEO_CALL.md`, `COURSE_BUILDER_DOCS.md`, `backend/BLOCKCHAIN_SETUP.md`, `backend/LOCAL_DEMO_CHAIN.md`
- Seed scripts (`backend/src/utils/seed*.js`, npm `seed:*` scripts): demo courses, platform data, certificate workflow, learning progress, Neo4j graph sync

---

## 11. Potential Interview Questions Per Feature

### Authentication & Authorization
1. Why issue both access and refresh tokens, and how does your refresh flow work (`refreshAccessToken`)?
2. You store JWTs in httpOnly cookies *and* return them in the body — what are the CSRF/XSS trade-offs?
3. Walk through `verifyJWT`. Why look in both the cookie and the `Authorization` header?
4. `isInstructor` permits admins too — how do you model "admins inherit instructor rights"?
5. The certificate routes aren't JWT-protected and accept `userId` in the body — what's the security risk and how would you fix it?

### Course authoring & approval
1. Why is course publishing a two-step (instructor submit → admin approve) workflow, and where is enrollment gated on it?
2. `course.controlller.js` and `module.controlller.js` have duplicate/typo filenames — how would you safely consolidate them?
3. How does `generateTemplateStructure` differ from a true LLM generation, and why keep a deterministic fallback?
4. How do you guarantee `order` uniqueness within a module/topic, and what happens on reorder?

### Progress tracking & anti-cheat
1. Explain the watch-time increment cap in `updateWatchTime` — what attack does it prevent?
2. Why complete at 90% watched rather than 100%? How is `effectiveLessonDuration` derived when stored duration is 0?
3. How is `completionPercentage` recalculated and where could it drift from reality?
4. How is the MediaPipe attention score captured client-side and used server-side?

### Adaptive learning & quizzes
1. Walk through the mastery formula in `adaptiveLearning.service.js`. Why those weights (40/35/25)?
2. How does engagement nudge quiz difficulty, and why ease difficulty when engagement is low?
3. In `getOrCreateQuiz`, why strip `correctIndex` before sending to the client?
4. The proctored exam zeroes the score at `maxWarnings` — how do you balance false positives vs. integrity?
5. Why generate the `QuizAttemptReport` in a background `setImmediate` task instead of inline? How would you make it durable across restarts?
6. Explain deterministic per-student question sampling (`pickQuestionsForStudent`) — pros/cons vs. random.

### AI Tutor & LLM usage
1. How do you keep the tutor personalized yet bounded (token/context limits)? Why only last 10 messages?
2. How do you handle non-JSON / malformed LLM output across the services?
3. Explain the Groq model-candidate fallback chain and the decommissioned-model handling.
4. How would you prevent prompt injection from lesson transcripts or student messages?

### Spaced repetition (SM-2)
1. Implement/derive SM-2 from `reviewFlashcard`. What do ease factor and interval represent?
2. Why reset interval but keep ease factor on a failed review?
3. How does `nextReviewAt` indexing support efficient "due today" queries?

### Certificates & blockchain
1. Why a hash chain (`previousHash`) *and* an on-chain registry — what does each protect against?
2. Walk through `verifyCertificate`: what makes a cert "valid" (hashMatches AND onChainValid)?
3. What does `CertificateRegistry.sol` store on-chain vs. off-chain, and why hash the recipient id?
4. The app runs even without blockchain configured — how is that graceful degradation implemented?
5. What are gas/cost and finality implications of anchoring every certificate?

### Live video (Twilio + Socket.IO)
1. Why generate Twilio tokens server-side, and what does `VideoGrant` scope?
2. Trace the call lifecycle across Socket.IO events. How is offline-callee detection done?
3. `connectedUsers` is an in-memory `Map` — how does this break with horizontal scaling, and how would you fix it (Redis adapter)?

### Media generation pipelines
1. Why run Python pipelines as subprocesses with a stdout JSON marker instead of an HTTP microservice?
2. How is progress derived from stdout, and what are the failure modes (timeout kill at 25 min)?
3. `pipelineJobs` is in-memory — how would you make jobs survive a restart / scale across workers?

### Neo4j knowledge graph
1. Why use Neo4j alongside MongoDB? What queries are graph-natural (prerequisites, ready-to-learn, study-debt)?
2. Explain the "ready-to-learn" Cypher (prereq satisfaction) and the study-debt computation.
3. How do you keep Mongo and Neo4j in sync (`syncMongoToNeo4jGraph.js`), and what consistency guarantees exist?

### Architecture & cross-cutting
1. Why a monolith over microservices here, and where would you split first at scale?
2. How do `asyncHandler` + `ApiError` + the global error middleware standardize error handling?
3. How are optional integrations made non-fatal at boot (lazy singletons)? Trade-offs?
4. The platform has no automated test suite on the backend — how would you introduce one (which layers first)?
5. CORS is an explicit allow-list — how would you manage origins across environments?
