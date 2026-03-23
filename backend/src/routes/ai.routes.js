import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
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
} from "../controllers/ai.controller.js";

const router = Router();

// All AI routes require authentication
router.use(verifyJWT);

// ── Dashboard Agent ──────────────────────────
// GET  /api/v1/ai/dashboard/:courseId
router.get("/dashboard/:courseId", getDashboardContext);

// ── AI Tutor ─────────────────────────────────
// POST /api/v1/ai/tutor/chat
router.post("/tutor/chat", tutorChat);
// POST /api/v1/ai/tutor/flag
router.post("/tutor/flag", flagChat);
// GET  /api/v1/ai/tutor/history/:courseId
router.get("/tutor/history/:courseId", tutorHistory);

// ── Adaptive Quiz ────────────────────────────
// GET  /api/v1/ai/quiz/:lessonId?courseId=xxx
router.get("/quiz/:lessonId", getQuiz);
// POST /api/v1/ai/quiz/submit
router.post("/quiz/submit", submitQuiz);
// POST /api/v1/ai/quiz/regenerate  (instructor)
router.post("/quiz/regenerate", regenQuiz);

// ── Flashcards ───────────────────────────────
// POST /api/v1/ai/flashcards/generate
router.post("/flashcards/generate", generateCards);
// GET  /api/v1/ai/flashcards/due/:courseId
router.get("/flashcards/due/:courseId", getDueCards);
// POST /api/v1/ai/flashcards/review
router.post("/flashcards/review", reviewCard);

// ── Study Plan ───────────────────────────────
// POST /api/v1/ai/study-plan/create
router.post("/study-plan/create", createPlan);
// POST /api/v1/ai/study-plan/replan
router.post("/study-plan/replan", replanStudy);

export default router;