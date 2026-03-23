import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Lesson } from "../models/lesson.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import { transcribeAudioFromUrl } from "../services/groq.service.js";
import { chatWithGroq } from "../services/groq.service.js";

import { runDashboardAgents } from "../services/agentOrchestrator.service.js";
import { sendMessageToTutor, flagTutorResponse, getChatHistory } from "../services/aiTutor.service.js";
import { getOrCreateQuiz, submitQuizAttempt, regenerateQuiz } from "../services/adaptiveQuiz.service.js";
import { generateFlashcards, reviewFlashcard, getDueFlashcards } from "../services/flashcardAgent.service.js";
import { createStudyPlan, runStudyPlanAgent } from "../services/studyPlanAgent.service.js";
import { findJobsFromCertificates, getTrendingJobsAndSkills } from "../services/jobRecommendation.service.js";

const transcriptCache = new Map();
const TRANSCRIPT_CACHE_MS = 1000 * 60 * 60 * 6;

const getTranscriptFromCache = (key) => {
  const cached = transcriptCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.updatedAt > TRANSCRIPT_CACHE_MS) {
    transcriptCache.delete(key);
    return null;
  }
  return cached.data;
};

// ─────────────────────────────────────────────
// GET DASHBOARD AGENT DATA
// GET /api/v1/ai/dashboard/:courseId
// Called every time student opens dashboard
// ─────────────────────────────────────────────
const getDashboardContext = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const studentId = req.user._id;

  const dashboardData = await runDashboardAgents(studentId, courseId);

  return res
    .status(200)
    .json(new ApiResponse(200, dashboardData, "Dashboard context loaded"));
});

// ─────────────────────────────────────────────
// AI TUTOR CHAT
// POST /api/v1/ai/tutor/chat
// ─────────────────────────────────────────────
const tutorChat = asyncHandler(async (req, res) => {
  const { courseId, lessonId, message, sessionId } = req.body;

  if (!message?.trim()) throw new ApiError(400, "Message is required");
  if (!courseId) throw new ApiError(400, "courseId is required");

  const result = await sendMessageToTutor({
    studentId: req.user._id,
    studentName: req.user.fullname,
    courseId,
    lessonId: lessonId || null,
    userMessage: message,
    sessionId: sessionId || null,
  });

  return res.status(200).json(new ApiResponse(200, result, "Tutor replied"));
});

// POST /api/v1/ai/tutor/flag
const flagChat = asyncHandler(async (req, res) => {
  const { sessionId, reason } = req.body;
  if (!sessionId) throw new ApiError(400, "sessionId is required");

  const result = await flagTutorResponse(sessionId, req.user._id, reason);
  return res.status(200).json(new ApiResponse(200, result, "Response flagged"));
});

// GET /api/v1/ai/tutor/history/:courseId
const tutorHistory = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { lessonId } = req.query;

  const history = await getChatHistory(req.user._id, courseId, lessonId);
  return res.status(200).json(new ApiResponse(200, history, "Chat history fetched"));
});

// ─────────────────────────────────────────────
// ADAPTIVE QUIZ
// GET /api/v1/ai/quiz/:lessonId
// ─────────────────────────────────────────────
const getQuiz = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  const { courseId } = req.query;

  if (!courseId) throw new ApiError(400, "courseId is required");

  const quiz = await getOrCreateQuiz(lessonId, req.user._id, courseId);
  return res.status(200).json(new ApiResponse(200, quiz, "Quiz fetched"));
});

// POST /api/v1/ai/quiz/submit
const submitQuiz = asyncHandler(async (req, res) => {
  const { quizId, lessonId, courseId, answers, timeTaken } = req.body;

  if (!quizId || !answers?.length) throw new ApiError(400, "quizId and answers required");

  const result = await submitQuizAttempt({
    studentId: req.user._id,
    quizId,
    lessonId,
    courseId,
    answers,
    timeTaken,
  });

  return res.status(200).json(new ApiResponse(200, result, "Quiz submitted"));
});

// POST /api/v1/ai/quiz/regenerate (instructor only)
const regenQuiz = asyncHandler(async (req, res) => {
  const { lessonId, courseId, difficulty } = req.body;
  if (!lessonId || !courseId) throw new ApiError(400, "lessonId and courseId required");

  const quiz = await regenerateQuiz(lessonId, courseId, difficulty || "medium");
  return res.status(200).json(new ApiResponse(200, quiz, "Quiz regenerated"));
});

// ─────────────────────────────────────────────
// FLASHCARDS
// POST /api/v1/ai/flashcards/generate
// ─────────────────────────────────────────────
const generateCards = asyncHandler(async (req, res) => {
  const { lessonId, courseId } = req.body;
  if (!lessonId || !courseId) throw new ApiError(400, "lessonId and courseId required");

  const result = await generateFlashcards(req.user._id, lessonId, courseId);
  return res.status(201).json(new ApiResponse(201, result, "Flashcards generated"));
});

// GET /api/v1/ai/flashcards/due/:courseId
const getDueCards = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const cards = await getDueFlashcards(req.user._id, courseId);
  return res.status(200).json(new ApiResponse(200, cards, "Due flashcards fetched"));
});

// POST /api/v1/ai/flashcards/review
const reviewCard = asyncHandler(async (req, res) => {
  const { flashcardId, quality } = req.body;

  if (flashcardId === undefined || quality === undefined)
    throw new ApiError(400, "flashcardId and quality (0-5) required");

  if (quality < 0 || quality > 5)
    throw new ApiError(400, "quality must be between 0 and 5");

  const result = await reviewFlashcard(flashcardId, req.user._id, quality);
  return res.status(200).json(new ApiResponse(200, result, "Flashcard reviewed"));
});

// ─────────────────────────────────────────────
// STUDY PLAN
// POST /api/v1/ai/study-plan/create
// ─────────────────────────────────────────────
const createPlan = asyncHandler(async (req, res) => {
  const { courseId, goalText, deadline } = req.body;

  if (!courseId || !goalText || !deadline)
    throw new ApiError(400, "courseId, goalText, and deadline are required");

  const plan = await createStudyPlan({
    studentId: req.user._id,
    courseId,
    goalText,
    deadline,
  });

  return res.status(201).json(new ApiResponse(201, plan, "Study plan created"));
});

// POST /api/v1/ai/study-plan/replan
const replanStudy = asyncHandler(async (req, res) => {
  const { courseId } = req.body;
  if (!courseId) throw new ApiError(400, "courseId required");

  const result = await runStudyPlanAgent(req.user._id, courseId, "manual");
  return res.status(200).json(new ApiResponse(200, result, "Study plan replanned"));
});
// GET /api/v1/ai/jobs/trending
const getTrendingJobs = asyncHandler(async (_req, res) => {
  const result = await getTrendingJobsAndSkills();
  return res.status(200).json(new ApiResponse(200, result, "Trending jobs fetched"));
});

// POST /api/v1/ai/jobs/finder
const findJobs = asyncHandler(async (req, res) => {
  const filters = req.body || {};
  const result = await findJobsFromCertificates({
    userId: req.user._id,
    filters,
  });

  return res.status(200).json(new ApiResponse(200, result, "Personalized jobs fetched"));
});
// GET /api/v1/ai/transcript/:lessonId
const getLessonTranscript = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  if (!lessonId) throw new ApiError(400, "lessonId is required");

  const lesson = await Lesson.findById(lessonId)
    .populate("course", "_id instructor")
    .select("_id title videoUrl course isFree");

  if (!lesson) throw new ApiError(404, "Lesson not found");
  if (!lesson.videoUrl) throw new ApiError(400, "Lesson does not have a video URL");

  const course = lesson.course;
  const isInstructor = String(course?.instructor) === String(req.user._id);
  const isAdmin = req.user.role === "admin";

  if (!lesson.isFree && !isInstructor && !isAdmin) {
    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: course?._id,
    }).select("_id");

    if (!enrollment) {
      throw new ApiError(403, "Enroll in the course to access this transcript");
    }
  }

  const cacheKey = `${lesson._id}:${lesson.videoUrl}`;
  const cached = getTranscriptFromCache(cacheKey);
  if (cached) {
    return res.status(200).json(new ApiResponse(200, cached, "Transcript fetched"));
  }

  const transcription = await transcribeAudioFromUrl(lesson.videoUrl);
  const normalizedSegments = (transcription.segments || []).map((segment, index) => ({
    id: String(segment.id ?? index),
    start: Number(segment.start || 0),
    end: Number(segment.end || Number(segment.start || 0) + 2),
    text: String(segment.text || "").trim(),
  })).filter((segment) => segment.text);

  const payload = {
    lessonId: String(lesson._id),
    text: transcription.text || "",
    language: transcription.language || "",
    duration: Number(transcription.duration || 0),
    segments: normalizedSegments,
    provider: transcription.provider,
    model: transcription.model,
  };

  transcriptCache.set(cacheKey, {
    data: payload,
    updatedAt: Date.now(),
  });

  return res.status(200).json(new ApiResponse(200, payload, "Transcript generated"));
});

// POST /api/v1/ai/notes/analyze
const analyzeNotes = asyncHandler(async (req, res) => {
  const { notes, lessonTitle, courseTitle } = req.body;

  if (!Array.isArray(notes) || notes.length === 0) {
    throw new ApiError(400, "notes must be a non-empty array");
  }

  const normalizedNotes = notes
    .map((note, index) => {
      const text = String(note?.text || "").trim();
      const timestamp = String(note?.timestamp || "").trim();
      const tags = Array.isArray(note?.tags)
        ? note.tags.map((tag) => String(tag || "").trim()).filter(Boolean)
        : [];

      if (!text) return null;

      return {
        id: String(note?.id || `note-${index}`),
        timestamp,
        text,
        tags,
      };
    })
    .filter(Boolean)
    .slice(0, 200);

  if (!normalizedNotes.length) {
    throw new ApiError(400, "No valid notes found to analyze");
  }

  const prompt = [
    "You are an educational AI assistant.",
    "Analyze the provided timestamped lesson notes and return only JSON.",
    "Schema:",
    "{",
    '  "summary": ["bullet1", "bullet2", ...],',
    '  "flashcards": [{"question":"...", "answer":"...", "timestamp":"mm:ss"}],',
    '  "concepts": [{"concept":"...", "reason":"...", "timestamp":"mm:ss"}]',
    "}",
    "Rules:",
    "- summary should have 4 to 8 concise bullets",
    "- flashcards should have 5 to 12 useful Q/A pairs",
    "- concepts should have 4 to 10 most important ideas",
    "- only use timestamps that exist in notes when possible",
    "- do not include markdown, comments, or extra keys",
    "Context:",
    `Course: ${String(courseTitle || "").trim() || "Unknown"}`,
    `Lesson: ${String(lessonTitle || "").trim() || "Unknown"}`,
    "Notes:",
    JSON.stringify(normalizedNotes),
  ].join("\n");

  const raw = await chatWithGroq(
    [
      {
        role: "system",
        content: "Return strictly valid JSON only.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    process.env.GROQ_NOTES_MODEL,
    true
  );

  let parsed;
  try {
    parsed = JSON.parse(raw || "{}");
  } catch {
    throw new ApiError(502, "AI returned invalid response while analyzing notes");
  }

  const summary = Array.isArray(parsed?.summary)
    ? parsed.summary.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 10)
    : [];

  const flashcards = Array.isArray(parsed?.flashcards)
    ? parsed.flashcards
      .map((card) => ({
        question: String(card?.question || "").trim(),
        answer: String(card?.answer || "").trim(),
        timestamp: String(card?.timestamp || "").trim(),
      }))
      .filter((card) => card.question && card.answer)
      .slice(0, 20)
    : [];

  const concepts = Array.isArray(parsed?.concepts)
    ? parsed.concepts
      .map((item) => ({
        concept: String(item?.concept || "").trim(),
        reason: String(item?.reason || "").trim(),
        timestamp: String(item?.timestamp || "").trim(),
      }))
      .filter((item) => item.concept)
      .slice(0, 20)
    : [];

  return res.status(200).json(
    new ApiResponse(200, { summary, flashcards, concepts }, "Notes analysis generated")
  );
});

export {
  getDashboardContext,
  tutorChat,
  flagChat,
  tutorHistory,
  getQuiz,
  submitQuiz,
  regenQuiz,
  generateCards,
  getDueCards,
  reviewCard,
  createPlan,
  replanStudy,
  getTrendingJobs,
  findJobs,
  getLessonTranscript,
  analyzeNotes,
};