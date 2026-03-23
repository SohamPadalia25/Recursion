import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

import { runDashboardAgents } from "../services/agentOrchestrator.service.js";
import { sendMessageToTutor, flagTutorResponse, getChatHistory } from "../services/aiTutor.service.js";
import { getOrCreateQuiz, submitQuizAttempt, regenerateQuiz } from "../services/adaptiveQuiz.service.js";
import { generateFlashcards, reviewFlashcard, getDueFlashcards } from "../services/flashcardAgent.service.js";
import { createStudyPlan, runStudyPlanAgent } from "../services/studyPlanAgent.service.js";

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
};