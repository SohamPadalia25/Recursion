// ADAPTIVE QUIZ AGENT
// Generates quiz questions dynamically using Groq (free LLM)
// Adapts difficulty based on student's recent performance history

import { chatWithGroq } from "./groq.service.js";
import { Quiz } from "../models/quiz.model.js";
import { QuizAttempt } from "../models/quizattempt.model.js";
import { Lesson } from "../models/lesson.model.js";
import { getAdaptiveQuizSignals } from "./adaptiveLearning.service.js";

// ─────────────────────────────────────────────
// GENERATE QUIZ FROM LESSON (Groq LLM)
// ─────────────────────────────────────────────
const generateQuizFromLesson = async (lessonId, difficulty = "medium") => {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) throw new Error("Lesson not found");

  // Use transcript if available, else use title as context
  const lessonContext = lesson.transcript
    ? lesson.transcript.slice(0, 2000)
    : `Lesson title: ${lesson.title}. Generate general questions about this topic.`;

  const prompt = `
You are a quiz generator. Generate exactly 5 multiple choice questions for this lesson.

Lesson content:
"""
${lessonContext}
"""

Difficulty level: ${difficulty}
- easy: basic recall, definitions
- medium: application and understanding  
- hard: analysis, edge cases, tricky scenarios

Return ONLY valid JSON in this exact format, no extra text:
{
  "questions": [
    {
      "text": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "difficulty": "${difficulty}",
      "explanation": "Brief explanation of why this answer is correct"
    }
  ]
}
`;

  const raw = await chatWithGroq(
    [{ role: "user", content: prompt }],
    process.env.GROQ_QUIZ_MODEL,
    true // json mode
  );

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // fallback parse if LLM adds extra text
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch[0]);
  }

  return parsed.questions;
};

// ─────────────────────────────────────────────
// GET OR CREATE QUIZ FOR LESSON
// Called after student finishes watching a lesson
// ─────────────────────────────────────────────
const getOrCreateQuiz = async (lessonId, studentId, courseId) => {
  // Check if quiz exists
  let quiz = await Quiz.findOne({ lesson: lessonId });

  // Determine difficulty based on student's recent performance
  const recentAttempts = await QuizAttempt.find({
    student: studentId,
    course: courseId,
  })
    .sort({ createdAt: -1 })
    .limit(5);

  const { difficulty, reason: difficultyReason } = await getAdaptiveQuizSignals(
    studentId,
    courseId,
    recentAttempts
  );

  if (!quiz) {
    // Generate new quiz using LLM
    const questions = await generateQuizFromLesson(lessonId, difficulty);
    quiz = await Quiz.create({
      lesson: lessonId,
      course: courseId,
      questions,
      isAIGenerated: true,
      currentDifficulty: difficulty,
      passingScore: 60,
    });
  }

  // Return quiz without revealing correct answers
  const safeQuiz = {
    _id: quiz._id,
    passingScore: quiz.passingScore,
    difficulty,
    difficultyReason,
    questions: quiz.questions.map((q) => ({
      _id: q._id,
      text: q.text,
      options: q.options,
      difficulty: q.difficulty,
      // correctIndex NOT included — sent only after submission
    })),
  };

  return safeQuiz;
};

// ─────────────────────────────────────────────
// SUBMIT QUIZ ATTEMPT + EVALUATE
// Called when student submits answers
// ─────────────────────────────────────────────
const submitQuizAttempt = async ({
  studentId,
  quizId,
  lessonId,
  courseId,
  answers, // [{ questionId, selectedIndex }]
  timeTaken,
}) => {
  const quiz = await Quiz.findById(quizId);
  if (!quiz) throw new Error("Quiz not found");

  // Evaluate answers
  const evaluated = answers.map((a) => {
    const question = quiz.questions.id(a.questionId);
    if (!question) return { ...a, isCorrect: false };
    return {
      questionId: a.questionId,
      selectedIndex: a.selectedIndex,
      isCorrect: question.correctIndex === a.selectedIndex,
    };
  });

  const correctCount = evaluated.filter((a) => a.isCorrect).length;
  const score = Math.round((correctCount / quiz.questions.length) * 100);
  const isPassed = score >= quiz.passingScore;

  // Count previous attempts
  const prevAttempts = await QuizAttempt.countDocuments({
    student: studentId,
    quiz: quizId,
  });

  // Save attempt
  const attempt = await QuizAttempt.create({
    student: studentId,
    quiz: quizId,
    lesson: lessonId,
    course: courseId,
    answers: evaluated,
    score,
    isPassed,
    difficulty: quiz.currentDifficulty,
    attemptNumber: prevAttempts + 1,
    timeTaken: timeTaken || 0,
  });

  // Build result with explanations revealed
  const result = {
    score,
    isPassed,
    correctCount,
    totalQuestions: quiz.questions.length,
    attemptNumber: attempt.attemptNumber,
    questions: quiz.questions.map((q, i) => ({
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
      selectedIndex: answers.find((a) => a.questionId.toString() === q._id.toString())
        ?.selectedIndex,
      isCorrect: evaluated.find((a) => a.questionId.toString() === q._id.toString())
        ?.isCorrect,
      explanation: q.explanation,
    })),
    // Next difficulty suggestion
    nextDifficulty: score >= 85 ? "hard" : score < 50 ? "easy" : "medium",
    message: isPassed
      ? "Great job! Moving to the next lesson."
      : "Not quite — review the lesson and try again.",
  };

  return result;
};

// ─────────────────────────────────────────────
// REGENERATE QUIZ (instructor or on retry)
// ─────────────────────────────────────────────
const regenerateQuiz = async (lessonId, courseId, difficulty = "medium") => {
  const questions = await generateQuizFromLesson(lessonId, difficulty);

  const quiz = await Quiz.findOneAndUpdate(
    { lesson: lessonId },
    {
      questions,
      isAIGenerated: true,
      currentDifficulty: difficulty,
    },
    { upsert: true, new: true }
  );

  return quiz;
};

export { getOrCreateQuiz, submitQuizAttempt, regenerateQuiz, generateQuizFromLesson };