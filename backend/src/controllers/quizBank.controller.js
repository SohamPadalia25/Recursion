import fs from "node:fs/promises";
import { createRequire } from "node:module";
import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { QuizBank } from "../models/quizBank.model.js";
import { QuizAttempt } from "../models/quizattempt.model.js";
import { QuizAttemptReport } from "../models/quizAttemptReport.model.js";
import { Lesson } from "../models/lesson.model.js";
import { Module } from "../models/module.model.js";
import { Course } from "../models/course.model.js";
import { Progress } from "../models/progress.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import { chatWithGroq } from "../services/groq.service.js";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const QUESTION_TYPES = ["mcq", "brief", "descriptive"];

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildTitleSearchRegex = (identifier = "") => {
  const tokens = String(identifier)
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((t) => escapeRegex(t));

  if (!tokens.length) return null;
  return new RegExp(tokens.join(".*"), "i");
};

const toPlainObject = (value) => {
  if (!value) return value;
  if (typeof value.toObject === "function") return value.toObject();
  return value;
};

const refId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value?._id) return String(value._id);
  if (value?._doc?._id) return String(value._doc._id);
  return String(value);
};

const normalizeQuizScope = async ({ courseId, moduleId, lessonId }) => {
  let normalizedCourseId = courseId || null;
  let normalizedModuleId = moduleId || null;
  let normalizedLessonId = lessonId || null;

  if (lessonId) {
    const lesson = await Lesson.findById(lessonId).select("_id course module");
    if (!lesson) throw new ApiError(400, "Selected lesson does not exist");

    if (courseId && String(lesson.course) !== String(courseId)) {
      throw new ApiError(400, "Selected lesson does not belong to selected course");
    }
    if (moduleId && String(lesson.module) !== String(moduleId)) {
      throw new ApiError(400, "Selected lesson does not belong to selected module");
    }

    normalizedCourseId = String(lesson.course);
    normalizedModuleId = String(lesson.module);
    normalizedLessonId = String(lesson._id);
  } else if (moduleId) {
    const module = await Module.findById(moduleId).select("_id course");
    if (!module) throw new ApiError(400, "Selected module does not exist");
    if (courseId && String(module.course) !== String(courseId)) {
      throw new ApiError(400, "Selected module does not belong to selected course");
    }

    normalizedCourseId = String(module.course);
    normalizedModuleId = String(module._id);
  } else if (courseId) {
    const course = await Course.findById(courseId).select("_id");
    if (!course) throw new ApiError(400, "Selected course does not exist");
    normalizedCourseId = String(course._id);
  }

  return {
    courseId: normalizedCourseId,
    moduleId: normalizedModuleId,
    lessonId: normalizedLessonId,
  };
};

const safeJsonParse = (raw) => {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    const m = String(raw || "").match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : {};
  }
};

const buildAttemptTelemetry = (attempt) => {
  const assigned = Array.isArray(attempt.assignedQuestions) ? attempt.assignedQuestions : [];
  const answers = Array.isArray(attempt.answers) ? attempt.answers : [];
  const answerMap = new Map(answers.map((a) => [String(a.questionId), a]));

  const questionRows = assigned.map((q, idx) => {
    const a = answerMap.get(String(q.questionId));
    const spent = Math.max(0, Number(a?.timeSpentSeconds || 0));
    const isAnswered = a
      ? q.type === "mcq"
        ? a.selectedIndex !== null && a.selectedIndex !== undefined
        : Boolean(String(a.answerText || "").trim())
      : false;

    return {
      index: idx + 1,
      questionId: String(q.questionId),
      type: q.type,
      text: q.text,
      options: Array.isArray(q.options) ? q.options : [],
      marks: Number(q.marks || 1),
      isAnswered,
      selectedIndex: a?.selectedIndex ?? null,
      answerText: String(a?.answerText || ""),
      isCorrect: Boolean(a?.isCorrect),
      timeSpentSeconds: spent,
    };
  });

  const totalQuestions = questionRows.length || 1;
  const correctCount = questionRows.filter((q) => q.isCorrect).length;
  const incorrectCount = questionRows.filter((q) => q.isAnswered && !q.isCorrect).length;
  const unansweredCount = questionRows.filter((q) => !q.isAnswered).length;
  const totalTime = Math.max(0, Number(attempt.timeTaken || 0));
  const avgTime = Math.round(
    questionRows.reduce((s, q) => s + Number(q.timeSpentSeconds || 0), 0) / totalQuestions
  );

  const times = questionRows.map((q) => Number(q.timeSpentSeconds || 0)).sort((a, b) => a - b);
  const medianTime = times.length ? times[Math.floor(times.length / 2)] : 0;

  const slowAndWrong = questionRows
    .filter(
      (q) =>
        q.isAnswered &&
        !q.isCorrect &&
        Number(q.timeSpentSeconds || 0) >= Math.max(15, Math.round(medianTime * 1.6))
    )
    .sort((a, b) => Number(b.timeSpentSeconds || 0) - Number(a.timeSpentSeconds || 0))
    .slice(0, 6)
    .map((q) => ({
      index: q.index,
      text: q.text,
      timeSpentSeconds: q.timeSpentSeconds,
    }));

  return {
    attemptId: String(attempt._id),
    quizTitle: attempt.quizBank?.title || "",
    courseTitle: attempt.course?.title || "",
    lessonTitle: attempt.lesson?.title || "",
    score: Number(attempt.score || 0),
    correctCount,
    incorrectCount,
    unansweredCount,
    totalQuestions,
    timeTakenSeconds: totalTime,
    avgTimePerQuestionSeconds: avgTime,
    warningCount: Number(attempt.warningCount || 0),
    slowAndWrong,
    questions: questionRows.map((q) => ({
      index: q.index,
      type: q.type,
      text: q.text,
      isCorrect: q.isCorrect,
      timeSpentSeconds: q.timeSpentSeconds,
    })),
  };
};

const generateAttemptReport = async (attempt) => {
  const telemetry = buildAttemptTelemetry(attempt);

  const prompt = `You are an expert learning analyst. Based on the quiz telemetry below, return ONLY valid JSON.

Schema:
{
  "summary": {
    "overall": "3-6 sentences",
    "verdict": "relearn" | "review" | "advance",
    "confidence": 0-100
  },
  "metrics": {
    "score": 0-100,
    "accuracy": 0-1,
    "correctCount": number,
    "incorrectCount": number,
    "unansweredCount": number,
    "timeTakenSeconds": number,
    "avgTimePerQuestionSeconds": number,
    "timeEfficiency": 0-100,
    "consistency": 0-100
  },
  "diagnostics": {
    "likelyWeakTopics": [{"topic":"string","reason":"string","priority":1|2|3}],
    "carelessMistakes": [{"questionIndex": number, "why":"string"}],
    "slowAndWrong": [{"questionIndex": number, "why":"string"}],
    "strengthSignals": ["string", "string"]
  },
  "recommendations": {
    "shouldRelearn": boolean,
    "relearnTopics": ["string"],
    "nextActions": ["string", "string", "string"]
  },
  "studyPlan": {
    "days": number,
    "daily": [
      {
        "day": 1,
        "focus": "string",
        "tasks": ["string"],
        "estimatedMinutes": number
      }
    ]
  }
}

Rules:
- Use the telemetry to justify your conclusions.
- If accuracy is low OR slow-and-wrong is frequent, lean toward relearn/review.
- Keep the plan practical (3-7 days). Include quizzes/flashcards as tasks.

Telemetry:
${JSON.stringify(telemetry)}`;

  const model = process.env.GROQ_QUIZ_REPORT_MODEL || process.env.GROQ_CHAT_MODEL;
  const raw = await chatWithGroq(
    [
      { role: "system", content: "Return strictly valid JSON only." },
      { role: "user", content: prompt },
    ],
    model,
    true
  );

  const parsed = safeJsonParse(raw);
  return { telemetry, report: parsed };
};

const queueAttemptReportGeneration = async (attemptId, studentId) => {
  const existing = await QuizAttemptReport.findOne({ attempt: attemptId, student: studentId });
  if (existing?.status === "ready") return;

  await QuizAttemptReport.findOneAndUpdate(
    { attempt: attemptId, student: studentId },
    { $setOnInsert: { status: "pending" }, $set: { error: "" } },
    { upsert: true, new: true }
  );

  setImmediate(async () => {
    try {
      const attempt = await QuizAttempt.findOne({ _id: attemptId, student: studentId })
        .populate("course", "title level category")
        .populate("lesson", "title")
        .populate("quizBank", "title");

      if (!attempt) throw new Error("Attempt not found for report generation");
      if (attempt.isTerminatedForCheating) {
        await QuizAttemptReport.findOneAndUpdate(
          { attempt: attemptId, student: studentId },
          {
            status: "ready",
            telemetry: buildAttemptTelemetry(attempt),
            report: {
              summary: {
                overall:
                  "This attempt was terminated due to cheating warnings, so a full learning analysis is limited.",
                verdict: "review",
                confidence: 35,
              },
              metrics: {
                score: Number(attempt.score || 0),
                accuracy: 0,
                correctCount: 0,
                incorrectCount: 0,
                unansweredCount: 0,
                timeTakenSeconds: Number(attempt.timeTaken || 0),
                avgTimePerQuestionSeconds: 0,
                timeEfficiency: 0,
                consistency: 0,
              },
              diagnostics: {
                likelyWeakTopics: [],
                carelessMistakes: [],
                slowAndWrong: [],
                strengthSignals: [],
              },
              recommendations: {
                shouldRelearn: true,
                relearnTopics: [],
                nextActions: [
                  "Re-attempt the quiz honestly in full-screen mode.",
                  "Review the lesson content and take notes before retrying.",
                ],
              },
              studyPlan: { days: 3, daily: [] },
            },
            generatedAt: new Date(),
            error: "",
          },
          { new: true }
        );
        return;
      }

      const { telemetry, report } = await generateAttemptReport(attempt);
      await QuizAttemptReport.findOneAndUpdate(
        { attempt: attemptId, student: studentId },
        {
          status: "ready",
          telemetry,
          report,
          generatedAt: new Date(),
          error: "",
        },
        { new: true }
      );
    } catch (err) {
      await QuizAttemptReport.findOneAndUpdate(
        { attempt: attemptId, student: studentId },
        { status: "failed", error: err instanceof Error ? err.message : String(err || "Report failed") },
        { new: true }
      );
    }
  });
};

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
  topic,
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
      : sourceType === "topic"
        ? `Topic provided by instructor:\n${topic || ""}`
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

const enrichQuizAvailabilityForStudent = async (quizBanks, studentId) => {
  const banks = Array.isArray(quizBanks) ? quizBanks.map(toPlainObject) : [];
  if (!banks.length) return [];

  const lessonIds = [...new Set(banks.map((item) => refId(item.lesson)).filter(Boolean))];
  const moduleIds = [...new Set(banks.map((item) => refId(item.module)).filter(Boolean))];
  const courseIds = [...new Set(banks.map((item) => refId(item.course)).filter(Boolean))];
  const quizIds = banks.map((item) => String(item._id));

  const moduleLessons = moduleIds.length
    ? await Lesson.find({ module: { $in: moduleIds } }).select("_id module")
    : [];
  const moduleLessonMap = new Map();
  moduleLessons.forEach((lesson) => {
    const key = String(lesson.module);
    if (!moduleLessonMap.has(key)) {
      moduleLessonMap.set(key, []);
    }
    moduleLessonMap.get(key).push(String(lesson._id));
  });

  const progressLessonIds = [...new Set([...lessonIds, ...moduleLessons.map((item) => String(item._id))])];

  const [progressRecords, enrollments, passedAttempts] = await Promise.all([
    progressLessonIds.length
      ? Progress.find({ student: studentId, lesson: { $in: progressLessonIds } }).select("lesson isCompleted")
      : [],
    courseIds.length
      ? Enrollment.find({ student: studentId, course: { $in: courseIds } }).select("course completionPercentage isCompleted")
      : [],
    quizIds.length
      ? QuizAttempt.find({
        student: studentId,
        quizBank: { $in: quizIds },
        isPassed: true,
        isTerminatedForCheating: false,
      })
        .select("quizBank score submittedAt")
        .sort({ submittedAt: -1 })
      : [],
  ]);

  const lessonProgressMap = new Map(
    progressRecords.map((record) => [String(record.lesson), Boolean(record.isCompleted)])
  );
  const enrollmentMap = new Map(
    enrollments.map((record) => [
      String(record.course),
      {
        completionPercentage: Number(record.completionPercentage || 0),
        isCompleted: Boolean(record.isCompleted),
      },
    ])
  );

  const passedByQuiz = new Map();
  passedAttempts.forEach((attempt) => {
    const key = String(attempt.quizBank);
    if (!passedByQuiz.has(key)) {
      passedByQuiz.set(key, attempt);
    }
  });

  return banks.map((bank) => {
    const quizId = String(bank._id);
    const lessonId = refId(bank.lesson);
    const moduleId = refId(bank.module);
    const courseId = refId(bank.course);

    let isUnlocked = true;
    let unlockRule = "always";
    let lockReason = "";

    if (lessonId) {
      unlockRule = "lesson_complete";
      const lessonDone = Boolean(lessonProgressMap.get(lessonId));
      isUnlocked = lessonDone;
      if (!lessonDone) {
        lockReason = "Complete this lesson to unlock its topic quiz.";
      }
    } else if (moduleId) {
      unlockRule = "module_complete";
      const moduleLessonIds = moduleLessonMap.get(moduleId) || [];
      const moduleDone =
        moduleLessonIds.length > 0 && moduleLessonIds.every((id) => Boolean(lessonProgressMap.get(id)));
      isUnlocked = moduleDone;
      if (!moduleDone) {
        lockReason = "Complete all lessons in this module to unlock this quiz.";
      }
    } else if (courseId) {
      unlockRule = "course_complete";
      const enrollment = enrollmentMap.get(courseId);
      const courseDone = Boolean(enrollment?.isCompleted || Number(enrollment?.completionPercentage || 0) >= 100);
      isUnlocked = courseDone;
      if (!courseDone) {
        lockReason = "Complete this course to unlock its quiz.";
      }
    }

    const passedAttempt = passedByQuiz.get(quizId);

    return {
      ...bank,
      isUnlocked,
      unlockRule,
      lockReason,
      hasPassed: Boolean(passedAttempt),
      bestPassedScore: passedAttempt ? Number(passedAttempt.score || 0) : null,
      passedAt: passedAttempt?.submittedAt || null,
    };
  });
};

const createQuizBank = asyncHandler(async (req, res) => {
  const { title, courseId, moduleId, lessonId, questions, distribution, maxWarnings } = req.body;
  if (!title?.trim()) throw new ApiError(400, "title is required");
  if (!Array.isArray(questions) || questions.length === 0) throw new ApiError(400, "questions are required");

  const scope = await normalizeQuizScope({ courseId, moduleId, lessonId });

  const quizBank = await QuizBank.create({
    title: title.trim(),
    instructor: req.user._id,
    course: scope.courseId || null,
    module: scope.moduleId || null,
    lesson: scope.lessonId || null,
    sourceType: "manual",
    questions,
    distribution: clampDistribution(distribution),
    maxWarnings: Number(maxWarnings || 3),
  });

  return res.status(201).json(new ApiResponse(201, quizBank, "Quiz bank created"));
});

const generateQuizBank = asyncHandler(async (req, res) => {
  const { title, sourceType, prompt, topic, courseId, moduleId, lessonId, maxWarnings } = req.body;
  let distribution = req.body.distribution;
  if (typeof distribution === "string") {
    try {
      distribution = JSON.parse(distribution);
    } catch {
      throw new ApiError(400, "distribution must be valid JSON");
    }
  }
  if (!title?.trim()) throw new ApiError(400, "title is required");
  if (!["auto", "prompt", "pdf", "topic"].includes(sourceType)) throw new ApiError(400, "Invalid sourceType");
  if (sourceType === "prompt" && !prompt?.trim()) throw new ApiError(400, "prompt is required for prompt mode");
  if (sourceType === "topic" && !topic?.trim()) throw new ApiError(400, "topic is required for topic mode");
  if (sourceType === "pdf" && !req.file?.path) throw new ApiError(400, "PDF file is required");

  let pdfText = "";
  if (sourceType === "pdf" && req.file?.path) {
    const buffer = await fs.readFile(req.file.path);
    const parsed = await pdfParse(buffer);
    pdfText = parsed.text || "";
    await fs.unlink(req.file.path).catch(() => { });
  }

  const scope = await normalizeQuizScope({ courseId, moduleId, lessonId });

  const normalizedDistribution = clampDistribution(distribution);
  const questions = await generateQuestionsWithAI({
    sourceType,
    prompt,
    topic,
    pdfText,
    lessonId,
    requestedCounts: normalizedDistribution,
  });

  const quizBank = await QuizBank.create({
    title: title.trim(),
    instructor: req.user._id,
    course: scope.courseId || null,
    module: scope.moduleId || null,
    lesson: scope.lessonId || null,
    sourceType,
    generationPrompt: prompt || topic || "",
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
  const { includeLocked = "false", courseId } = req.query;

  const filter = { isPublished: true };
  if (courseId) {
    const courseLessonIds = await Lesson.find({ course: courseId }).distinct("_id");
    const courseModuleIds = await Module.find({ course: courseId }).distinct("_id");
    filter.$or = [{ course: courseId }, { module: { $in: courseModuleIds } }, { lesson: { $in: courseLessonIds } }];
  }

  const items = await QuizBank.find(filter)
    .select("title course module lesson distribution maxWarnings sourceType createdAt")
    .sort({ createdAt: -1 });

  const hydrated = await enrichQuizAvailabilityForStudent(items, req.user._id);
  const shouldIncludeLocked = String(includeLocked).toLowerCase() === "true";
  const payload = shouldIncludeLocked ? hydrated : hydrated.filter((item) => item.isUnlocked);

  return res.status(200).json(new ApiResponse(200, payload, "Available quizzes fetched"));
});

const listCourseQuizBanksForStudent = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const courseLessonIds = await Lesson.find({ course: courseId }).distinct("_id");
  const courseModuleIds = await Module.find({ course: courseId }).distinct("_id");
  let items = await QuizBank.find({
    isPublished: true,
    $or: [{ course: courseId }, { module: { $in: courseModuleIds } }, { lesson: { $in: courseLessonIds } }],
  })
    .select("title course module lesson distribution maxWarnings sourceType createdAt")
    .populate("module", "title order")
    .populate("lesson", "title order module")
    .sort({ createdAt: -1 });

  // Backward-compatible fallback for older quiz banks that were not explicitly mapped to course/lesson.
  if (!items.length) {
    const course = await Course.findById(courseId).select("title").lean();
    const titleRegex = buildTitleSearchRegex(course?.title || "");
    if (titleRegex) {
      items = await QuizBank.find({
        isPublished: true,
        course: null,
        module: null,
        lesson: null,
        title: { $regex: titleRegex },
      })
        .select("title course module lesson distribution maxWarnings sourceType createdAt")
        .sort({ createdAt: -1 });
    }
  }

  const hydrated = await enrichQuizAvailabilityForStudent(items, req.user._id);
  return res.status(200).json(new ApiResponse(200, hydrated, "Course quizzes fetched"));
});

const startQuizAttempt = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const quizBank = await QuizBank.findById(quizId);
  if (!quizBank || !quizBank.isPublished) throw new ApiError(404, "Quiz not available");

  const [availability] = await enrichQuizAvailabilityForStudent([quizBank], req.user._id);
  if (!availability?.isUnlocked) {
    throw new ApiError(403, availability?.lockReason || "Quiz is locked for this student");
  }

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
    const timeSpentSeconds = Math.max(0, Math.round(Number(answer.timeSpentSeconds || 0)));
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
      timeSpentSeconds,
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

  // Auto-generate report in background (do not await)
  queueAttemptReportGeneration(attempt._id, req.user._id).catch(() => { });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        attemptId: attempt._id,
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

const getQuizAttemptReport = asyncHandler(async (req, res) => {
  const { attemptId } = req.params;
  if (!attemptId) throw new ApiError(400, "attemptId is required");

  const attemptExists = await QuizAttempt.exists({ _id: attemptId, student: req.user._id });
  if (!attemptExists) throw new ApiError(404, "Attempt not found");

  const doc = await QuizAttemptReport.findOne({ attempt: attemptId, student: req.user._id }).select(
    "attempt status telemetry report error generatedAt"
  );

  if (!doc) {
    await queueAttemptReportGeneration(attemptId, req.user._id);
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          attemptId: String(attemptId),
          status: "pending",
          telemetry: null,
          report: null,
          error: "",
        },
        "Report queued"
      )
    );
  }

  if (doc.status === "failed") {
    // allow re-queue on fetch
    await queueAttemptReportGeneration(attemptId, req.user._id);
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        attemptId: String(doc.attempt),
        status: doc.status,
        telemetry: doc.telemetry || null,
        report: doc.report || null,
        error: String(doc.error || ""),
        generatedAt: doc.generatedAt || null,
      },
      doc.status === "ready" ? "Report ready" : "Report pending"
    )
  );
});

export {
  createQuizBank,
  generateQuizBank,
  listMyQuizBanks,
  publishQuizBank,
  listPublishedQuizBanks,
  listCourseQuizBanksForStudent,
  startQuizAttempt,
  submitQuizAttemptWithLogs,
  getQuizAttemptReport,
};
