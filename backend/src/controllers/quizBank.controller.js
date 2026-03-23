import fs from "node:fs/promises";
import { createRequire } from "node:module";
import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { QuizBank } from "../models/quizBank.model.js";
import { QuizAttempt } from "../models/quizattempt.model.js";
import { Lesson } from "../models/lesson.model.js";
import { chatWithGroq } from "../services/groq.service.js";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const QUESTION_TYPES = ["mcq", "brief", "descriptive"];

const clampDistribution = (distribution = {}) => {
  const normalized = {
    questionsPerStudent: Number(distribution.questionsPerStudent || 10),
    mcqCount: Number(distribution.mcqCount || 0),
    briefCount: Number(distribution.briefCount || 0),
    descriptiveCount: Number(distribution.descriptiveCount || 0),
    easyCount: Number(distribution.easyCount || 0),
    mediumCount: Number(distribution.mediumCount || 0),
    hardCount: Number(distribution.hardCount || 0),
    strategy: distribution.strategy === "random" ? "random" : "balanced",
  };

  const totalByType = normalized.mcqCount + normalized.briefCount + normalized.descriptiveCount;
  const totalByDifficulty = normalized.easyCount + normalized.mediumCount + normalized.hardCount;
  if (totalByType > 0) normalized.questionsPerStudent = totalByType;
  if (totalByDifficulty > 0) normalized.questionsPerStudent = Math.max(normalized.questionsPerStudent, totalByDifficulty);
  return normalized;
};

const parseGeneratedQuestions = (raw) => {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new ApiError(500, "AI response parsing failed");
    parsed = JSON.parse(jsonMatch[0]);
  }

  const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
  return questions
    .map((q) => {
      const type = QUESTION_TYPES.includes(q.type) ? q.type : "mcq";
      const options = Array.isArray(q.options) ? q.options.filter(Boolean).map(String) : [];
      return {
        type,
        text: String(q.text || "").trim(),
        options: type === "mcq" ? options : [],
        correctIndex: type === "mcq" ? Number(q.correctIndex ?? 0) : null,
        expectedAnswer: type !== "mcq" ? String(q.expectedAnswer || "").trim() : "",
        explanation: String(q.explanation || "").trim(),
        marks: Number(q.marks || 1),
        difficulty: ["easy", "medium", "hard"].includes(q.difficulty) ? q.difficulty : "medium",
      };
    })
    .filter((q) => q.text.length > 0 && (q.type !== "mcq" || q.options.length >= 2));
};

const generateQuestionsWithAI = async ({
  sourceType,
  prompt,
  pdfText,
  lessonId,
  requestedCounts,
}) => {
  let lessonContext = "";
  if (lessonId) {
    const lesson = await Lesson.findById(lessonId);
    if (lesson) {
      lessonContext = lesson.transcript?.slice(0, 3000) || lesson.summary || lesson.title;
    }
  }

  const baseContext =
    sourceType === "pdf"
      ? `PDF content:\n${pdfText?.slice(0, 8000) || ""}`
      : sourceType === "prompt"
        ? `Instructor prompt:\n${prompt || ""}`
        : `Lesson context:\n${lessonContext || "General software engineering topics."}`;

  const counts = {
    mcq: Number(requestedCounts?.mcqCount || 6),
    brief: Number(requestedCounts?.briefCount || 3),
    descriptive: Number(requestedCounts?.descriptiveCount || 1),
    easy: Number(requestedCounts?.easyCount || 3),
    medium: Number(requestedCounts?.mediumCount || 5),
    hard: Number(requestedCounts?.hardCount || 2),
  };

  const total = counts.mcq + counts.brief + counts.descriptive;
  if (total <= 0) throw new ApiError(400, "At least one question is required");

  const generationPrompt = `
Generate a mixed question bank.

${baseContext}

Return ONLY JSON with this format:
{
  "questions": [
    {
      "type": "mcq|brief|descriptive",
      "text": "question",
      "options": ["A","B","C","D"],
      "correctIndex": 0,
      "expectedAnswer": "for brief/descriptive",
      "explanation": "short reason",
      "marks": 1,
      "difficulty": "easy|medium|hard"
    }
  ]
}

Required counts:
- mcq: ${counts.mcq}
- brief: ${counts.brief}
- descriptive: ${counts.descriptive}

Required difficulty split:
- easy: ${counts.easy}
- medium: ${counts.medium}
- hard: ${counts.hard}
`;

  const raw = await chatWithGroq([{ role: "user", content: generationPrompt }], "llama-3.3-70b-versatile", true);
  return parseGeneratedQuestions(raw);
};

const pickQuestionsForStudent = (quizBank, studentId) => {
  const distribution = clampDistribution(quizBank.distribution);
  const all = quizBank.questions || [];

  if (distribution.strategy === "random") {
    const shuffled = all.slice().sort(() => Math.random() - 0.5);
    return shuffled.slice(0, distribution.questionsPerStudent);
  }

  const grouped = {
    mcq: all.filter((q) => q.type === "mcq"),
    brief: all.filter((q) => q.type === "brief"),
    descriptive: all.filter((q) => q.type === "descriptive"),
  };
  const difficultyGroups = {
    easy: all.filter((q) => (q.difficulty || "medium") === "easy"),
    medium: all.filter((q) => (q.difficulty || "medium") === "medium"),
    hard: all.filter((q) => (q.difficulty || "medium") === "hard"),
  };

  const deterministicOffset = Array.from(String(studentId)).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const pickFromType = (arr, count) => {
    if (!arr.length || count <= 0) return [];
    const picks = [];
    for (let i = 0; i < count; i += 1) {
      picks.push(arr[(deterministicOffset + i) % arr.length]);
    }
    return picks;
  };

  const selectedMap = new Map();
  const pushUnique = (items) => {
    items.forEach((item) => {
      if (item?._id) selectedMap.set(String(item._id), item);
    });
  };

  pushUnique(pickFromType(grouped.mcq, distribution.mcqCount));
  pushUnique(pickFromType(grouped.brief, distribution.briefCount));
  pushUnique(pickFromType(grouped.descriptive, distribution.descriptiveCount));
  pushUnique(pickFromType(difficultyGroups.easy, distribution.easyCount));
  pushUnique(pickFromType(difficultyGroups.medium, distribution.mediumCount));
  pushUnique(pickFromType(difficultyGroups.hard, distribution.hardCount));

  if (selectedMap.size < distribution.questionsPerStudent) {
    pushUnique(pickFromType(all, distribution.questionsPerStudent));
  }

  return Array.from(selectedMap.values()).slice(0, distribution.questionsPerStudent);
};

const createQuizBank = asyncHandler(async (req, res) => {
  const { title, courseId, lessonId, questions, distribution, maxWarnings } = req.body;
  if (!title?.trim()) throw new ApiError(400, "title is required");
  if (!Array.isArray(questions) || questions.length === 0) throw new ApiError(400, "questions are required");

  const quizBank = await QuizBank.create({
    title: title.trim(),
    instructor: req.user._id,
    course: courseId || null,
    lesson: lessonId || null,
    sourceType: "manual",
    questions,
    distribution: clampDistribution(distribution),
    maxWarnings: Number(maxWarnings || 3),
  });

  return res.status(201).json(new ApiResponse(201, quizBank, "Quiz bank created"));
});

const generateQuizBank = asyncHandler(async (req, res) => {
  const { title, sourceType, prompt, courseId, lessonId, maxWarnings } = req.body;
  let distribution = req.body.distribution;
  if (typeof distribution === "string") {
    try {
      distribution = JSON.parse(distribution);
    } catch {
      throw new ApiError(400, "distribution must be valid JSON");
    }
  }
  if (!title?.trim()) throw new ApiError(400, "title is required");
  if (!["auto", "prompt", "pdf"].includes(sourceType)) throw new ApiError(400, "Invalid sourceType");
  if (sourceType === "prompt" && !prompt?.trim()) throw new ApiError(400, "prompt is required for prompt mode");
  if (sourceType === "pdf" && !req.file?.path) throw new ApiError(400, "PDF file is required");

  let pdfText = "";
  if (sourceType === "pdf" && req.file?.path) {
    const buffer = await fs.readFile(req.file.path);
    const parsed = await pdfParse(buffer);
    pdfText = parsed.text || "";
    await fs.unlink(req.file.path).catch(() => {});
  }

  const normalizedDistribution = clampDistribution(distribution);
  const questions = await generateQuestionsWithAI({
    sourceType,
    prompt,
    pdfText,
    lessonId,
    requestedCounts: normalizedDistribution,
  });

  const quizBank = await QuizBank.create({
    title: title.trim(),
    instructor: req.user._id,
    course: courseId || null,
    lesson: lessonId || null,
    sourceType,
    generationPrompt: prompt || "",
    questions,
    distribution: normalizedDistribution,
    maxWarnings: Number(maxWarnings || 3),
  });

  return res.status(201).json(new ApiResponse(201, quizBank, "AI quiz bank generated"));
});

const listMyQuizBanks = asyncHandler(async (req, res) => {
  const items = await QuizBank.find({ instructor: req.user._id }).sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, items, "Quiz banks fetched"));
});

const publishQuizBank = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const { isPublished } = req.body;
  const updated = await QuizBank.findOneAndUpdate(
    { _id: quizId, instructor: req.user._id },
    { isPublished: Boolean(isPublished) },
    { new: true }
  );
  if (!updated) throw new ApiError(404, "Quiz bank not found");
  return res.status(200).json(new ApiResponse(200, updated, "Quiz bank visibility updated"));
});

const listPublishedQuizBanks = asyncHandler(async (req, res) => {
  const items = await QuizBank.find({ isPublished: true })
    .select("title course lesson distribution maxWarnings sourceType createdAt")
    .sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, items, "Available quizzes fetched"));
});

const startQuizAttempt = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const quizBank = await QuizBank.findById(quizId);
  if (!quizBank || !quizBank.isPublished) throw new ApiError(404, "Quiz not available");

  const selectedQuestions = pickQuestionsForStudent(quizBank, req.user._id.toString());
  if (!selectedQuestions.length) throw new ApiError(400, "Question bank does not have enough questions");

  const existingAttempts = await QuizAttempt.countDocuments({
    student: req.user._id,
    quizBank: quizBank._id,
  });

  const attempt = await QuizAttempt.create({
    student: req.user._id,
    quiz: quizBank._id,
    quizBank: quizBank._id,
    lesson: quizBank.lesson || undefined,
    course: quizBank.course || undefined,
    assignedQuestions: selectedQuestions.map((q) => ({
      questionId: q._id,
      type: q.type,
      text: q.text,
      options: q.options,
      marks: q.marks,
    })),
    answers: [],
    score: 0,
    isPassed: false,
    difficulty: "medium",
    attemptNumber: existingAttempts + 1,
    startedAt: new Date(),
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        attemptId: attempt._id,
        quizId: quizBank._id,
        title: quizBank.title,
        maxWarnings: quizBank.maxWarnings,
        questions: attempt.assignedQuestions,
      },
      "Quiz attempt started"
    )
  );
});

const submitQuizAttemptWithLogs = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const { attemptId, answers, activityLogs, warningCount, timeTaken } = req.body;
  if (!attemptId) throw new ApiError(400, "attemptId is required");

  const [attempt, quizBank] = await Promise.all([
    QuizAttempt.findOne({ _id: attemptId, student: req.user._id, quizBank: quizId }),
    QuizBank.findById(quizId),
  ]);
  if (!attempt || !quizBank) throw new ApiError(404, "Attempt not found");
  if (!Array.isArray(answers) || answers.length === 0) throw new ApiError(400, "answers are required");

  const questionMap = new Map((quizBank.questions || []).map((q) => [q._id.toString(), q]));
  const evaluatedAnswers = answers.map((answer) => {
    const questionId = String(answer.questionId);
    const question = questionMap.get(questionId);
    const answerText = String(answer.answerText || "").trim();
    let isCorrect = false;

    if (question) {
      if (question.type === "mcq") {
        isCorrect = Number(answer.selectedIndex) === Number(question.correctIndex);
      } else if (question.expectedAnswer) {
        isCorrect = answerText.toLowerCase() === String(question.expectedAnswer).trim().toLowerCase();
      }
    }

    return {
      questionId: answer.questionId,
      selectedIndex: answer.selectedIndex ?? null,
      answerText,
      isCorrect,
    };
  });

  const obtained = evaluatedAnswers.reduce((sum, ans) => {
    const q = questionMap.get(String(ans.questionId));
    return sum + (ans.isCorrect ? Number(q?.marks || 1) : 0);
  }, 0);
  const total = attempt.assignedQuestions.reduce((sum, q) => sum + Number(q.marks || 1), 0) || 1;
  const score = Math.round((obtained / total) * 100);
  const isPassed = score >= 50;
  const warnings = Number(warningCount || 0);
  const terminated = warnings >= Number(quizBank.maxWarnings || 3);

  attempt.answers = evaluatedAnswers;
  attempt.activityLogs = Array.isArray(activityLogs) ? activityLogs : [];
  attempt.warningCount = warnings;
  attempt.isTerminatedForCheating = terminated;
  attempt.timeTaken = Number(timeTaken || 0);
  attempt.score = terminated ? 0 : score;
  attempt.isPassed = terminated ? false : isPassed;
  attempt.submittedAt = new Date();
  await attempt.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        score: attempt.score,
        isPassed: attempt.isPassed,
        isTerminatedForCheating: terminated,
        warningCount: warnings,
        maxWarnings: quizBank.maxWarnings,
      },
      terminated ? "Attempt ended due to cheating warnings" : "Quiz submitted"
    )
  );
});

export {
  createQuizBank,
  generateQuizBank,
  listMyQuizBanks,
  publishQuizBank,
  listPublishedQuizBanks,
  startQuizAttempt,
  submitQuizAttemptWithLogs,
};
