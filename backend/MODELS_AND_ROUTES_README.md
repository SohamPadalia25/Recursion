# Backend Models and Routes Reference

This document summarizes:
- All Mongoose models in `backend/src/models`
- Their schema fields (type, required/default/constraints)
- The route endpoints in `backend/src/routes`
- Which models each route primarily touches

## 1) Route Mounting Status (from `src/app.js`)

These route groups are **currently mounted**:
- `app.use("/api", graphRoutes)`
- `app.use("/api", certificateRoutes)`
- `app.use("/api/v1/video", videoCallRoutes)`
- `app.use("/api/v1/notes", notesRoutes)`
- `app.use("/api", mailerRoutes)`

These route files exist but are **not mounted in `src/app.js` right now**:
- `src/routes/user.routes.js`
- `src/routes/course.routes.js`
- `src/routes/module.routes.js`
- `src/routes/lesson.routes.js`
- `src/routes/ai.routes.js`
- `src/routes/courseGeneration.routes.js`
- `src/routes/other.routes.js`

If these are expected to work in runtime, they must be imported and mounted in `src/app.js`.

---

## 2) Models and Fields

## User (`user.model.js`)
Purpose: platform identity/auth profile for student/instructor/admin.

Fields:
- `username`: String, required, unique, lowercase, trimmed, indexed
- `email`: String, required, unique, lowercase, trimmed
- `fullname`: String, required, trimmed, indexed
- `avatar`: String, optional
- `coverImage`: String, optional
- `role`: String enum [`student`, `instructor`, `admin`], default `student`
- `bio`: String, optional, trimmed
- `password`: String, required
- `refreshToken`: String, optional
- `createdAt`, `updatedAt`: timestamps

Hooks/methods:
- Pre-save password hashing (bcrypt)
- `isPasswordCorrect(password)`
- `generateAccessToken()`
- `generateRefreshToken()`

Routes touching User:
- `POST /api/v1/users/register`
- `POST /api/v1/users/login`
- `POST /api/v1/users/refresh-token`
- `POST /api/v1/users/logout`
- `POST /api/v1/users/change-password`
- `GET /api/v1/users/current-user`
- `PATCH /api/v1/users/update-account`
- `PATCH /api/v1/users/avatar`
- `PATCH /api/v1/users/cover-image`
- `GET /api/v1/users/profile/:username`
- `GET /api/v1/users/:userId` (admin)
- `GET /api/v1/admin/users`
- `PATCH /api/v1/admin/users/:userId/role`
- `GET /api/v1/admin/stats` (aggregates user counts)

## Course (`course.model.js`)
Purpose: course metadata, publishing status, pricing, aggregate analytics.

Fields:
- `title`: String, required, trimmed, indexed
- `description`: String, required, trimmed
- `instructor`: ObjectId -> User, required
- `thumbnail`: String, optional
- `category`: String, required, trimmed, indexed
- `tags`: [String]
- `price`: Number, default `0`
- `status`: String enum [`draft`, `published`, `archived`], default `draft`
- `isApproved`: Boolean, default `false`
- `totalDuration`: Number, default `0`
- `enrollmentCount`: Number, default `0`
- `averageRating`: Number, default `0`, min `0`, max `5`
- `totalReviews`: Number, default `0`
- `level`: String enum [`beginner`, `intermediate`, `advanced`], default `beginner`
- `language`: String, default `English`
- `createdAt`, `updatedAt`: timestamps

Routes touching Course:
- `GET /api/v1/courses`
- `POST /api/v1/courses`
- `GET /api/v1/courses/my-courses`
- `GET /api/v1/courses/:courseId`
- `PATCH /api/v1/courses/:courseId`
- `DELETE /api/v1/courses/:courseId`
- `PATCH /api/v1/courses/:courseId/submit`
- `GET /api/v1/admin/courses`
- `GET /api/v1/admin/courses/pending`
- `PATCH /api/v1/admin/courses/:courseId/approve`
- `PATCH /api/v1/admin/courses/:courseId/unpublish`
- `POST /:courseId/generate-structure`
- `POST /:courseId/save-structure`
- `GET /:courseId/structure`
- `GET /api/course/:id`
- `GET /api/graph` (course graph view)

## Module (`module.model.js`)
Purpose: ordered sections within a course.

Fields:
- `title`: String, required, trimmed
- `description`: String, optional
- `course`: ObjectId -> Course, required
- `order`: Number, required
- `isLocked`: Boolean, default `false`
- `prerequisiteModule`: ObjectId -> Module, default `null`
- `createdAt`, `updatedAt`: timestamps

Indexes:
- Unique composite: `{ course: 1, order: 1 }`

Routes touching Module:
- `POST /api/v1/modules`
- `PATCH /api/v1/modules/reorder`
- `GET /api/v1/modules/course/:courseId`
- `PATCH /api/v1/modules/:moduleId`
- `DELETE /api/v1/modules/:moduleId`

## Lesson (`lesson.model.js`)
Purpose: lessons inside a module, with video + resources.

Fields:
- `title`: String, required
- `module`: ObjectId -> Module, required
- `course`: ObjectId -> Course, required
- `videoUrl`: String, required
- `duration`: Number, default `0` (seconds)
- `order`: Number, required
- `transcript`: String, default `""`
- `summary`: String, default `""`
- `resources`: Array of:
  - `title`: String, required
  - `url`: String, required
  - `type`: enum [`pdf`, `link`, `slides`, `code`, `other`], default `link`
- `isFree`: Boolean, default `false`
- `description`: String, optional
- `createdAt`, `updatedAt`: timestamps

Indexes:
- Unique composite: `{ module: 1, order: 1 }`

Routes touching Lesson:
- `POST /api/v1/lessons`
- `GET /api/v1/lessons/module/:moduleId`
- `GET /api/v1/lessons/:lessonId`
- `PATCH /api/v1/lessons/:lessonId`
- `DELETE /api/v1/lessons/:lessonId`
- `PATCH /api/v1/lessons/:lessonId/resource`

## Enrollment (`enrollment.model.js`)
Purpose: student-course registration and completion state.

Fields:
- `student`: ObjectId -> User, required
- `course`: ObjectId -> Course, required
- `enrolledAt`: Date, default `Date.now`
- `completedAt`: Date, default `null`
- `isCompleted`: Boolean, default `false`
- `certificateUrl`: String, default `null`
- `studyGoal`: String, optional
- `deadline`: Date, default `null`
- `completionPercentage`: Number, default `0`, min `0`, max `100`
- `createdAt`, `updatedAt`: timestamps

Indexes:
- Unique composite: `{ student: 1, course: 1 }`

Routes touching Enrollment:
- `POST /api/v1/enrollments`
- `GET /api/v1/enrollments/my`
- `GET /api/v1/enrollments/status/:courseId`
- `GET /api/v1/enrollments/course/:courseId/students`
- `DELETE /api/v1/enrollments/:courseId`
- `GET /api/v1/admin/stats` (aggregate count)

## Progress (`progress.model.js`)
Purpose: per-lesson learning progress tracking.

Fields:
- `student`: ObjectId -> User, required
- `course`: ObjectId -> Course, required
- `lesson`: ObjectId -> Lesson, required
- `isCompleted`: Boolean, default `false`
- `watchedDuration`: Number, default `0`
- `completedAt`: Date, default `null`
- `attentionScore`: Number, default `null`, min `0`, max `100`
- `lastWatchedAt`: Date, default `Date.now`
- `createdAt`, `updatedAt`: timestamps

Indexes:
- Unique composite: `{ student: 1, lesson: 1 }`
- Query index: `{ student: 1, course: 1 }`

Routes touching Progress:
- `POST /api/v1/progress/lesson/:lessonId/complete`
- `PATCH /api/v1/progress/lesson/:lessonId/watch`
- `PATCH /api/v1/progress/lesson/:lessonId/attention`
- `GET /api/v1/progress/course/:courseId`
- `GET /api/v1/progress/student/:studentId/course/:courseId`

## Review (`review.model.js`)
Purpose: student course ratings/reviews.

Fields:
- `student`: ObjectId -> User, required
- `course`: ObjectId -> Course, required
- `rating`: Number, required, min `1`, max `5`
- `comment`: String, optional, trimmed
- `isFlagged`: Boolean, default `false`
- `createdAt`, `updatedAt`: timestamps

Indexes:
- Unique composite: `{ student: 1, course: 1 }`

Hook:
- Post-save aggregate updates course `averageRating` and `totalReviews`.

Routes touching Review:
- `POST /api/v1/reviews`
- `GET /api/v1/reviews/:courseId`
- `DELETE /api/v1/reviews/:courseId`
- `GET /api/v1/admin/ai/flagged-chats` (separate admin moderation domain)
- `GET /api/v1/admin/stats` (includes flagged reviews count)

## Certificate (`certificate.model.js`)
Purpose: completion certificate record with blockchain linkage fields.

Fields:
- `userId`: ObjectId -> User, required, indexed
- `courseId`: ObjectId -> Course, required, indexed
- `issuedAt`: Date, required, default `Date.now`
- `hash`: String, required, unique, indexed
- `previousHash`: String, required, default `GENESIS`
- `qrCodeUrl`: String, required
- `onChainTxHash`: String, default `null`, indexed
- `onChainBlockNumber`: Number, default `null`
- `onChainContractAddress`: String, default `null`
- `onChainChainId`: Number, default `null`
- `onChainIssuerAddress`: String, default `null`
- `onChainExplorerUrl`: String, default `null`
- `onChainRecipientIdHash`: String, default `null`
- `createdAt`, `updatedAt`: timestamps

Indexes:
- Unique composite: `{ userId: 1, courseId: 1 }`

Routes touching Certificate:
- `POST /api/verify-completion/:courseId`
- `POST /api/certificate/issue`
- `GET /api/certificate/verify/:hash`
- `GET /api/certificate/course/:courseId`

## Discussion (`discussion.model.js`)
Purpose: course/lesson forum posts and replies.

Fields:
- `course`: ObjectId -> Course, required
- `lesson`: ObjectId -> Lesson, default `null`
- `author`: ObjectId -> User, required
- `content`: String, required
- `parentPost`: ObjectId -> Discussion, default `null`
- `upvotes`: [ObjectId -> User]
- `isPinned`: Boolean, default `false`
- `isDeleted`: Boolean, default `false`
- `createdAt`, `updatedAt`: timestamps

Indexes:
- Query index: `{ course: 1, lesson: 1 }`

Routes touching Discussion:
- `POST /api/v1/discussions`
- `GET /api/v1/discussions/:courseId`
- `GET /api/v1/discussions/replies/:postId`
- `PATCH /api/v1/discussions/:postId/upvote`
- `PATCH /api/v1/discussions/:postId/pin`
- `DELETE /api/v1/discussions/:postId`

## Notification (`notification.model.js`)
Purpose: user notification center and in-app alerts.

Fields:
- `recipient`: ObjectId -> User, required
- `type`: String enum:
  - `quiz_due`, `plan_replan`, `plan_reminder`, `badge_earned`,
  - `announcement`, `course_approved`, `course_rejected`, `enrollment`, `certificate`
- `message`: String, required
- `isRead`: Boolean, default `false`
- `link`: String, default `null`
- `relatedCourse`: ObjectId -> Course, default `null`
- `createdAt`, `updatedAt`: timestamps

Indexes:
- Query index: `{ recipient: 1, isRead: 1 }`

Routes touching Notification:
- `GET /api/v1/notifications`
- `PATCH /api/v1/notifications/read-all`
- `PATCH /api/v1/notifications/:notificationId/read`
- `DELETE /api/v1/notifications/:notificationId`

## AITutorChat (`Aitutorchat.model.js`)
Purpose: stores chat sessions between student and AI tutor.

Fields:
- `student`: ObjectId -> User, required
- `course`: ObjectId -> Course, required
- `lesson`: ObjectId -> Lesson, default `null`
- `messages`: Array of:
  - `role`: enum [`user`, `assistant`], required
  - `content`: String, required
  - `createdAt`: Date, default `Date.now`
- `sessionId`: String, required, unique
- `isFlagged`: Boolean, default `false`
- `flagReason`: String, default `null`
- `createdAt`, `updatedAt`: timestamps

Indexes:
- Query index: `{ student: 1, course: 1 }`

Routes touching AITutorChat:
- `POST /api/v1/ai/tutor/chat`
- `POST /api/v1/ai/tutor/flag`
- `GET /api/v1/ai/tutor/history/:courseId`
- `GET /api/v1/admin/ai/flagged-chats`
- `GET /api/v1/admin/ai/usage`

## Badge (`badge.model.js`)
Purpose: achievement records.

Fields:
- `student`: ObjectId -> User, required
- `type`: enum [`first_quiz`, `quiz_master`, `streak_7`, `streak_30`, `module_complete`, `course_complete`, `fast_learner`, `top_performer`, `helpful_peer`], required
- `course`: ObjectId -> Course, default `null`
- `awardedAt`: Date, default `Date.now`
- `metadata`: Mixed, default `{}`
- `createdAt`, `updatedAt`: timestamps

Indexes:
- Query index: `{ student: 1 }`

Routes touching Badge:
- `GET /api/v1/users/my-badges`

## Quiz (`quiz.model.js`)
Purpose: quiz definitions per lesson.

Fields:
- `lesson`: ObjectId -> Lesson, required
- `course`: ObjectId -> Course, required
- `questions`: Array of:
  - `text`: String, required
  - `options`: String[4], required
  - `correctIndex`: Number (0..3), required
  - `difficulty`: enum [`easy`, `medium`, `hard`], default `medium`
  - `explanation`: String, optional
- `passingScore`: Number, default `60`, min `0`, max `100`
- `isAIGenerated`: Boolean, default `false`
- `currentDifficulty`: enum [`easy`, `medium`, `hard`], default `medium`
- `createdAt`, `updatedAt`: timestamps

Indexes:
- Unique: `{ lesson: 1 }`

Routes touching Quiz:
- `GET /api/v1/ai/quiz/:lessonId`
- `POST /api/v1/ai/quiz/submit`
- `POST /api/v1/ai/quiz/regenerate`

## QuizAttempt (`quizattempt.model.js`)
Purpose: student attempt history and scoring.

Fields:
- `student`: ObjectId -> User, required
- `quiz`: ObjectId -> Quiz, required
- `lesson`: ObjectId -> Lesson, required
- `course`: ObjectId -> Course, required
- `answers`: Array of:
  - `questionId`: ObjectId, required
  - `selectedIndex`: Number (0..3), required
  - `isCorrect`: Boolean, required
- `score`: Number, required, min `0`, max `100`
- `isPassed`: Boolean, required
- `difficulty`: enum [`easy`, `medium`, `hard`], required
- `attemptNumber`: Number, required, default `1`
- `timeTaken`: Number, default `0`
- `createdAt`, `updatedAt`: timestamps

Indexes:
- Query index: `{ student: 1, quiz: 1 }`

Routes touching QuizAttempt:
- `POST /api/v1/ai/quiz/submit`

## Flashcard (`flashCard.model.js`)
Purpose: spaced-repetition cards for each student/course/lesson.

Fields:
- `student`: ObjectId -> User, required
- `lesson`: ObjectId -> Lesson, required
- `course`: ObjectId -> Course, required
- `question`: String, required
- `answer`: String, required
- `isAIGenerated`: Boolean, default `true`
- `nextReviewAt`: Date, default `Date.now`
- `reviewCount`: Number, default `0`
- `easeFactor`: Number, default `2.5`, min `1.3`
- `interval`: Number, default `1`
- `lastReviewedAt`: Date, default `null`
- `createdAt`, `updatedAt`: timestamps

Indexes:
- Query index: `{ student: 1, nextReviewAt: 1 }`

Routes touching Flashcard:
- `POST /api/v1/ai/flashcards/generate`
- `GET /api/v1/ai/flashcards/due/:courseId`
- `POST /api/v1/ai/flashcards/review`

## StudyPlan (`studyPlan.model.js`)
Purpose: AI-generated day-wise schedule for completing a course.

Fields:
- `student`: ObjectId -> User, required
- `course`: ObjectId -> Course, required
- `goalText`: String, required
- `deadline`: Date, required
- `dailyTasks`: Array of:
  - `date`: Date, required
  - `lessons`: [ObjectId -> Lesson]
  - `estimatedMins`: Number, default `30`
  - `isCompleted`: Boolean, default `false`
- `lastReplanAt`: Date, default `null`
- `replanCount`: Number, default `0`
- `isActive`: Boolean, default `true`
- `createdAt`, `updatedAt`: timestamps

Indexes:
- Unique composite: `{ student: 1, course: 1 }`

Routes touching StudyPlan:
- `POST /api/v1/ai/study-plan/create`
- `POST /api/v1/ai/study-plan/replan`

## Topic (`topic.model.js`)
Purpose: hierarchical concept nodes inside module/course.

Fields:
- `title`: String, required
- `description`: String, optional
- `module`: ObjectId -> Module, required
- `course`: ObjectId -> Course, required
- `order`: Number, required
- `difficulty`: enum [`easy`, `medium`, `hard`], default `medium`
- `learningOutcomes`: Array of:
  - `description`: String, required
  - `bloomLevel`: enum [`remember`, `understand`, `apply`, `analyze`, `evaluate`, `create`], default `understand`
- `prerequisites`: [ObjectId -> Topic]
- `alternatePaths`: Array of:
  - `condition`: String
  - `suggestedTopicId`: ObjectId -> Topic
  - `description`: String
- `estimatedDuration`: Number, default `0`
- `estimatedLearnerCount`: Number, default `0`
- `createdAt`, `updatedAt`: timestamps

Indexes:
- Unique composite: `{ module: 1, order: 1 }`
- Query index: `{ course: 1 }`

Routes touching Topic:
- No dedicated topic route file in `src/routes`.
- Indirectly touched by course-structure generation and graph APIs.

## Subtopic (`subtopic.model.js`)
Purpose: sub-level concept nodes under a topic.

Fields:
- `title`: String, required
- `description`: String, optional
- `topic`: ObjectId -> Topic, required
- `course`: ObjectId -> Course, required
- `module`: ObjectId -> Module, required
- `order`: Number, required
- `difficulty`: enum [`easy`, `medium`, `hard`], default `medium`
- `learningOutcomes`: Array of:
  - `description`: String, required
  - `bloomLevel`: enum [`remember`, `understand`, `apply`, `analyze`, `evaluate`, `create`], default `understand`
- `prerequisites`: [ObjectId -> Subtopic]
- `alternatePaths`: Array of:
  - `condition`: String
  - `suggestedSubtopicId`: ObjectId -> Subtopic
  - `description`: String
- `estimatedDuration`: Number, default `0`
- `isOptional`: Boolean, default `false`
- `createdAt`, `updatedAt`: timestamps

Indexes:
- Unique composite: `{ topic: 1, order: 1 }`
- Query index: `{ course: 1 }`

Routes touching Subtopic:
- No dedicated subtopic route file in `src/routes`.
- Indirectly touched by course-structure generation and graph APIs.

## Content (`content.model.js`)
Purpose: attach learning assets to topic/subtopic/lesson.

Fields:
- `title`: String, required
- `type`: enum [`video`, `pdf`, `notes`, `link`, `code`, `interactive`, `quiz`], required
- `url`: String, required
- `course`: ObjectId -> Course, required
- `topic`: ObjectId -> Topic, default `null`
- `subtopic`: ObjectId -> Subtopic, default `null`
- `lesson`: ObjectId -> Lesson, default `null`
- `duration`: Number, default `0`
- `tags`: [String]
- `description`: String, optional
- `order`: Number, default `0`
- `isPublished`: Boolean, default `true`
- `transcript`: String, default `""`
- `thumbnail`: String, optional
- `sizeInBytes`: Number, default `0`
- `createdAt`, `updatedAt`: timestamps

Indexes:
- `{ course: 1 }`, `{ topic: 1 }`, `{ subtopic: 1 }`, `{ lesson: 1 }`

Validation:
- Pre-save requires at least one of `topic`, `subtopic`, or `lesson`.

Routes touching Content:
- No dedicated content route file in `src/routes`.

## Call (`call.model.js`)
Purpose: video call session metadata.

Fields:
- `callerId`: String, required, indexed, trimmed
- `callerName`: String, required
- `callerRole`: String, default `student`
- `calleeId`: String, required, indexed
- `calleeName`: String, optional
- `calleeRole`: String, default `instructor`
- `roomName`: String, required, indexed
- `status`: enum [`ringing`, `accepted`, `rejected`, `ended`], default `ringing`
- `startedAt`: Date, optional
- `endedAt`: Date, optional
- `durationSeconds`: Number, default `0`
- `createdAt`, `updatedAt`: timestamps

Indexes:
- `{ callerId: 1, createdAt: -1 }`
- `{ calleeId: 1, createdAt: -1 }`
- `{ roomName: 1 }`

Routes touching Call:
- `GET /api/v1/video/rooms`
- `GET /api/v1/video/room/:room/participants`
- `POST /api/v1/video/end-room`

## Notes (`notes.model.js`)
Purpose: student note documents (often tied to a video call/session).

Fields:
- `studentId`: ObjectId -> User, required
- `callId`: String, default `null`
- `roomName`: String, default `null`
- `title`: String, default `Class Notes`
- `content`: String, required
- `sessionDate`: Date, default `Date.now`
- `createdAt`, `updatedAt`: timestamps

Indexes:
- `{ studentId: 1, createdAt: -1 }`
- `{ callId: 1 }`

Routes touching Notes:
- `POST /api/v1/notes/save`
- `GET /api/v1/notes/:studentId`
- `GET /api/v1/notes/detail/:noteId`
- `PUT /api/v1/notes/:noteId`
- `DELETE /api/v1/notes/:noteId`

## Empty/unused model file
- `user.models.js` exists but is empty.

---

## 3) Route File Breakdown

## `user.routes.js`
Intended base: `/api/v1/users`
- Register/login/session/token refresh/user profile/account update/avatar/cover image/my-learning/my-badges/admin user lookup.
- Primary models: User, Enrollment, Badge (via controller-level joins).

## `course.routes.js`
Intended base: `/api/v1/courses`
- Create/read/update/delete course, list instructor courses, submit for approval.
- Also exports admin analytics handlers used by `other.routes.js`.
- Primary models: Course, User, Enrollment, Review, AITutorChat, Notification.

## `module.routes.js`
Intended base: `/api/v1/modules`
- Create/update/delete/reorder/list modules.
- Primary model: Module (with Course relation).

## `lesson.routes.js`
Intended base: `/api/v1/lessons`
- Create/read/update/delete lessons, list by module, patch lesson resources.
- Primary model: Lesson.

## `ai.routes.js`
Intended base: `/api/v1/ai`
- Dashboard context, AI tutor chat/flag/history, adaptive quiz, flashcards, study plan.
- Primary models: AITutorChat, Quiz, QuizAttempt, Flashcard, StudyPlan, Progress, Enrollment.

## `courseGeneration.routes.js`
Intended base: implementation dependent (commonly mounted under `/api/v1/course-generation` or similar)
- Generate/save/retrieve AI-created course structure.
- Primary models: Course, Module, Topic, Subtopic, Content/Lesson (controller-driven).

## `other.routes.js`
Intended grouped bases:
- Enrollment: `/api/v1/enrollments`
- Progress: `/api/v1/progress`
- Discussions: `/api/v1/discussions`
- Reviews: `/api/v1/reviews`
- Notifications: `/api/v1/notifications`
- Admin: `/api/v1/admin`

Primary models by router:
- Enrollment router -> Enrollment
- Progress router -> Progress
- Discussion router -> Discussion
- Review router -> Review
- Notification router -> Notification
- Admin router -> User/Course/Enrollment/AITutorChat/Review

## `graph.routes.js` (mounted)
Mounted base: `/api`
- `GET /api/graph`
- `GET /api/course/:id`
- Primary models: Course graph hierarchy models (Course/Module/Topic/Subtopic/Lesson, controller-driven).

## `certificate.routes.js` (mounted)
Mounted base: `/api` and `/api/v1`
- `POST /api/verify-completion/:courseId`
- `POST /api/certificate/issue`
- `GET /api/certificate/verify/:hash`
- `GET /api/certificate/course/:courseId`
- `POST /api/v1/verify-completion/:courseId`
- `POST /api/v1/certificate/issue`
- `GET /api/v1/certificate/verify/:hash`
- `GET /api/v1/certificate/course/:courseId`
- Primary model: Certificate (+ Enrollment/Course/User validation in controller).

## `notes.routes.js` (mounted)
Mounted base: `/api/v1/notes`
- `POST /save`
- `GET /:studentId`
- `GET /detail/:noteId`
- `PUT /:noteId`
- `DELETE /:noteId`
- Primary model: Notes.

## `videoCall.routes.js` (mounted)
Mounted base: `/api/v1/video`
- `GET /rooms`
- `POST /generate-token`
- `GET /room/:room/participants`
- `POST /end-room`
- Primary model: Call (+ Twilio integration).

## `mailer.routes.js` (mounted)
Mounted base: `/api`
- `POST /api/v1/mailer/send`
- `POST /api/v1/mailer/send-whatsapp`
- `POST /api/v1/mailer/send-live-session-invite`
- Sends generic mail, OTP mail, WhatsApp messages, and combined live-session invites.
- Primary model impact: none directly (service route).

---

## 4) Quick Model-to-Route Matrix

- User -> user routes, admin routes
- Course -> course routes, admin routes, graph routes, course-generation routes
- Module -> module routes, graph/course-generation routes
- Lesson -> lesson routes, progress routes, ai routes
- Enrollment -> enrollment routes, admin stats
- Progress -> progress routes
- Review -> review routes, admin stats
- Certificate -> certificate routes
- Discussion -> discussion routes
- Notification -> notification routes, admin approval workflows
- AITutorChat -> ai routes, admin AI moderation/stats
- Badge -> user my-badges
- Quiz -> ai quiz routes
- QuizAttempt -> ai quiz submit
- Flashcard -> ai flashcard routes
- StudyPlan -> ai study-plan routes
- Topic/Subtopic/Content -> graph and generation flows (no dedicated route file)
- Call -> video call routes
- Notes -> notes routes

---

## 5) Notes for Maintenance

- There are naming inconsistencies in some files (`course.controlller.js`, `Aitutorchat.model.js` vs `aiTutorChat.model.js` import casing in one route file).
- Route mounting is currently active in `src/app.js` for users, courses, modules, lessons, AI, course-generation, enrollment/progress/discussion/review/notification/admin, notes, video, mailer, graph, and certificates.
