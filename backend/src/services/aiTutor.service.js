// AI TUTOR AGENT
// Uses Groq (free) to answer student doubts in Socratic style
// Maintains full conversation history for context

import { chatWithGroq } from "./groq.service.js";
import { AITutorChat } from "../models/aiTutorChat.model.js";
import { Lesson } from "../models/lesson.model.js";
import { v4 as uuidv4 } from "uuid";

// ─────────────────────────────────────────────
// SYSTEM PROMPT — defines the AI tutor persona
// ─────────────────────────────────────────────
const buildSystemPrompt = (lesson, course, studentName) => `
You are an expert AI tutor for the course "${course.title}".
The student's name is ${studentName}.
They are currently on lesson: "${lesson?.title || "General course question"}".

${lesson?.transcript ? `Lesson context:\n${lesson.transcript.slice(0, 1500)}` : ""}

Your tutoring rules:
1. NEVER give the answer directly — use the Socratic method. Ask guiding questions.
2. If the student is clearly frustrated (after 2 wrong turns), give a hint.
3. If asked for explanation styles, respond in the requested style: ELI5, technical, or analogy.
4. Keep responses under 120 words unless explaining a complex concept.
5. End every response with one follow-up question to keep learning going.
6. If a concept is outside the course scope, gently redirect back.

Always be warm, encouraging, and patient.
`.trim();

// ─────────────────────────────────────────────
// SEND MESSAGE TO AI TUTOR
// POST /api/v1/ai/tutor/chat
// ─────────────────────────────────────────────
const sendMessageToTutor = async ({
  studentId,
  studentName,
  courseId,
  lessonId,
  userMessage,
  sessionId,
}) => {
  // Load or create chat session
  let session = null;
  if (sessionId) {
    session = await AITutorChat.findOne({ sessionId, student: studentId });
  }

  if (!session) {
    session = await AITutorChat.create({
      student: studentId,
      course: courseId,
      lesson: lessonId || null,
      messages: [],
      sessionId: uuidv4(),
    });
  }

  // Load lesson context if provided
  const lesson = lessonId
    ? await Lesson.findById(lessonId).populate("module", "title")
    : null;

  // Build messages array for LLM (system + history + new message)
  const systemPrompt = buildSystemPrompt(
    lesson,
    { title: "your course" }, // replace with actual course.title
    studentName
  );

  const llmMessages = [
    { role: "system", content: systemPrompt },
    // Include last 10 messages for context window
    ...session.messages.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];

  // Call Groq LLM
  const aiResponse = await chatWithGroq(llmMessages, "llama3-8b-8192");

  // Save both messages to DB
  session.messages.push(
    { role: "user", content: userMessage, createdAt: new Date() },
    { role: "assistant", content: aiResponse, createdAt: new Date() }
  );
  await session.save();

  return {
    sessionId: session.sessionId,
    reply: aiResponse,
    messageCount: session.messages.length,
  };
};

// ─────────────────────────────────────────────
// FLAG A BAD RESPONSE (thumbs down)
// POST /api/v1/ai/tutor/flag
// ─────────────────────────────────────────────
const flagTutorResponse = async (sessionId, studentId, reason) => {
  const session = await AITutorChat.findOne({ sessionId, student: studentId });
  if (!session) return null;
  session.isFlagged = true;
  session.flagReason = reason || "No reason provided";
  await session.save();
  return session;
};

// ─────────────────────────────────────────────
// GET CHAT HISTORY
// GET /api/v1/ai/tutor/history/:courseId
// ─────────────────────────────────────────────
const getChatHistory = async (studentId, courseId, lessonId) => {
  const filter = { student: studentId, course: courseId };
  if (lessonId) filter.lesson = lessonId;

  const sessions = await AITutorChat.find(filter)
    .sort({ createdAt: -1 })
    .limit(10)
    .select("sessionId messages createdAt lesson");

  return sessions;
};

export { sendMessageToTutor, flagTutorResponse, getChatHistory };