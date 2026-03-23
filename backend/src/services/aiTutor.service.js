// AI TUTOR AGENT
// Uses Groq (free) to answer student doubts in Socratic style
// Maintains full conversation history for context

import { chatWithGroq } from "./groq.service.js";
import { AITutorChat } from "../models/aiTutorChat.model.js";
import { Lesson } from "../models/lesson.model.js";
import { Course } from "../models/course.model.js";
import { Progress } from "../models/progress.model.js";
import { QuizAttempt } from "../models/quizAttempt.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import { v4 as uuidv4 } from "uuid";

// ─────────────────────────────────────────────
// SYSTEM PROMPT — defines the AI tutor persona
// ─────────────────────────────────────────────
const formatPercentage = (value) => {
  const n = Number(value || 0);
  return `${Math.max(0, Math.min(100, Math.round(n)))}%`;
};

const gatherLearnerContext = async ({ studentId, courseId, lessonId }) => {
  const [course, lesson, progressRows, recentAttempts, enrollments, allProgressRows, allAttempts] = await Promise.all([
    Course.findById(courseId).select("title description level category"),
    lessonId ? Lesson.findById(lessonId).populate("module", "title").select("title transcript module") : Promise.resolve(null),
    Progress.find({ student: studentId, course: courseId }).select("lesson isCompleted watchedDuration attentionScore").populate("lesson", "title"),
    QuizAttempt.find({ student: studentId, course: courseId })
      .sort({ createdAt: -1 })
      .limit(8)
      .populate({ path: "lesson", select: "title" })
      .populate({ path: "quiz", select: "questions" }),
    Enrollment.find({ student: studentId }).populate("course", "title").select("course completionPercentage isCompleted"),
    Progress.find({ student: studentId }).select("lesson isCompleted watchedDuration"),
    QuizAttempt.find({ student: studentId }).sort({ createdAt: -1 }).limit(20).select("score isPassed createdAt"),
  ]);

  const totalLessons = progressRows.length;
  const completedLessons = progressRows.filter((row) => row.isCompleted).length;
  const completionPct = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  const weakByAttention = progressRows
    .filter((row) => Number.isFinite(row.attentionScore) && row.attentionScore < 60)
    .map((row) => ({
      title: row.lesson?.title || "Untitled lesson",
      reason: `Low attention score (${Math.round(row.attentionScore)})`,
    }));

  const weakByQuiz = recentAttempts
    .filter((attempt) => Number(attempt.score || 0) < 60)
    .map((attempt) => ({
      title: attempt.lesson?.title || "Unknown lesson",
      reason: `Low quiz score (${Math.round(attempt.score || 0)}%)`,
    }));

  const weakAreaMap = new Map();
  [...weakByAttention, ...weakByQuiz].forEach((item) => {
    const key = `${item.title}::${item.reason}`;
    if (!weakAreaMap.has(key)) weakAreaMap.set(key, item);
  });
  const weakAreas = Array.from(weakAreaMap.values()).slice(0, 5);

  const mistakes = [];
  for (const attempt of recentAttempts.slice(0, 3)) {
    const quizQuestions = Array.isArray(attempt.quiz?.questions) ? attempt.quiz.questions : [];
    const wrongAnswers = Array.isArray(attempt.answers)
      ? attempt.answers.filter((answer) => !answer.isCorrect)
      : [];

    for (const wrong of wrongAnswers.slice(0, 3)) {
      const question = quizQuestions.find(
        (q) => String(q._id) === String(wrong.questionId)
      );
      mistakes.push({
        lesson: attempt.lesson?.title || "Unknown lesson",
        question: question?.text || "Missed quiz question",
        selectedIndex: wrong.selectedIndex,
      });
      if (mistakes.length >= 8) break;
    }
    if (mistakes.length >= 8) break;
  }

  const currentTopic = {
    lessonTitle: lesson?.title || "General course question",
    moduleTitle: lesson?.module?.title || "General module",
  };

  const enrolledCoursesCount = enrollments.length;
  const enrolledCoursesPreview = enrollments
    .slice(0, 5)
    .map((enrollment) => ({
      title: enrollment.course?.title || "Untitled course",
      completionPercentage: Math.max(0, Math.round(Number(enrollment.completionPercentage || 0))),
      isCompleted: Boolean(enrollment.isCompleted),
    }));

  const totalVideosWatched = new Set(
    allProgressRows
      .filter((row) => Number(row.watchedDuration || 0) > 0)
      .map((row) => String(row.lesson))
  ).size;

  const conceptsFromCompleted = allProgressRows
    .filter((row) => row.isCompleted)
    .map((row) => String(row.lesson));

  const conceptsCoveredCount = new Set(conceptsFromCompleted).size;

  const overallAverageScore = allAttempts.length
    ? allAttempts.reduce((sum, attempt) => sum + Number(attempt.score || 0), 0) / allAttempts.length
    : 0;

  const currentCourseAverageScore = recentAttempts.length
    ? recentAttempts.reduce((sum, attempt) => sum + Number(attempt.score || 0), 0) / recentAttempts.length
    : 0;

  const recentPerformanceTrend = recentAttempts
    .slice(0, 3)
    .map((attempt) => Math.round(Number(attempt.score || 0)));

  return {
    course,
    lesson,
    completionPct,
    completedLessons,
    totalLessons,
    weakAreas,
    mistakes,
    currentTopic,
    enrolledCoursesCount,
    enrolledCoursesPreview,
    totalVideosWatched,
    conceptsCoveredCount,
    overallAverageScore,
    currentCourseAverageScore,
    recentPerformanceTrend,
  };
};

const buildSystemPrompt = ({ studentName, learnerContext }) => {
  const {
    course,
    lesson,
    completionPct,
    completedLessons,
    totalLessons,
    weakAreas,
    mistakes,
    currentTopic,
    enrolledCoursesCount,
    enrolledCoursesPreview,
    totalVideosWatched,
    conceptsCoveredCount,
    overallAverageScore,
    currentCourseAverageScore,
    recentPerformanceTrend,
  } = learnerContext;

  const weakAreasText = weakAreas.length
    ? weakAreas.map((area, index) => `${index + 1}. ${area.title} - ${area.reason}`).join("\n")
    : "No clear weak areas yet.";

  const mistakesText = mistakes.length
    ? mistakes.map((mistake, index) => `${index + 1}. [${mistake.lesson}] ${mistake.question}`).join("\n")
    : "No recent mistakes available.";

  const enrolledCoursesText = enrolledCoursesPreview.length
    ? enrolledCoursesPreview
      .map((courseItem, index) => `${index + 1}. ${courseItem.title} (${courseItem.completionPercentage}%${courseItem.isCompleted ? ", completed" : ""})`)
      .join("\n")
    : "No enrolled courses found.";

  return `
You are an expert AI tutor for the course "${course?.title || "your course"}".
The student's name is ${studentName}.

Learner context (use this to personalize every response):
- Current topic: ${currentTopic.moduleTitle} -> ${currentTopic.lessonTitle}
- Course progress: ${completedLessons}/${totalLessons} lessons completed (${formatPercentage(completionPct)})
- Enrolled courses count: ${enrolledCoursesCount}
- Enrolled courses snapshot:
${enrolledCoursesText}
- Total videos watched: ${totalVideosWatched}
- Concepts covered so far: ${conceptsCoveredCount}
- Performance in current course (avg quiz score): ${formatPercentage(currentCourseAverageScore)}
- Overall performance (avg quiz score): ${formatPercentage(overallAverageScore)}
- Recent performance trend (latest first): ${recentPerformanceTrend.length ? recentPerformanceTrend.join("%, ") + "%" : "No attempts yet"}
- Weak areas:
${weakAreasText}
- Recent mistakes:
${mistakesText}

${lesson?.transcript ? `Lesson context:\n${lesson.transcript.slice(0, 1800)}` : ""}

Response requirements:
1. Personalize advice based on weak areas and mistakes, do not give generic guidance.
2. Give a short explanation first, then exactly 2 concrete next steps.
3. Include one targeted practice suggestion tied to the current topic.
4. Use Socratic guidance for direct-answer requests, but provide hints when the student is stuck.
5. Keep responses concise (<= 140 words unless asked for deep explanation).
6. End with one follow-up question.
7. Reference at least one metric from learner context (progress/performance/videos/concepts) in your guidance.

Always be warm, encouraging, and specific.
`.trim();
};

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
  const learnerContext = await gatherLearnerContext({
    studentId,
    courseId,
    lessonId,
  });

  // Build messages array for LLM (system + history + new message)
  const systemPrompt = buildSystemPrompt({
    studentName,
    learnerContext,
  });

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
  const aiResponse = await chatWithGroq(llmMessages, process.env.GROQ_TUTOR_MODEL);

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