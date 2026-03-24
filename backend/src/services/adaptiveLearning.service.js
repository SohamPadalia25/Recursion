// Adaptive learning: mastery + engagement signals, personalized path, LLM coaching.
// Used by the dashboard orchestrator, quiz difficulty, and /ai/adaptive/:courseId.

import { Lesson } from "../models/lesson.model.js";
import { Progress } from "../models/progress.model.js";
import { QuizAttempt } from "../models/quizAttempt.model.js";
import { Flashcard } from "../models/flashcard.model.js";
import { chatWithGroq } from "./groq.service.js";

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// ─────────────────────────────────────────────
// Quiz difficulty from recent attempts (+ optional engagement / weak topics)
// ─────────────────────────────────────────────
const analyzePerformance = (recentAttempts, opts = {}) => {
  if (!recentAttempts?.length) {
    return { difficulty: "medium", reason: "no attempts yet" };
  }

  const last3 = recentAttempts.slice(0, 3);
  const avgLast3 = last3.reduce((s, a) => s + Number(a.score || 0), 0) / last3.length;

  let difficulty = "medium";
  let reason = "";

  if (avgLast3 >= 85) {
    difficulty = "hard";
    reason = `avg score ${Math.round(avgLast3)}% — escalating`;
  } else if (avgLast3 < 50) {
    difficulty = "easy";
    reason = `avg score ${Math.round(avgLast3)}% — needs support`;
  } else {
    difficulty = "medium";
    reason = `avg score ${Math.round(avgLast3)}% — on track`;
  }

  const engagement = opts.courseEngagementIndex;
  if (Number.isFinite(engagement) && engagement < 45) {
    if (difficulty === "hard") {
      difficulty = "medium";
      reason += "; eased — lower engagement";
    } else if (difficulty === "medium") {
      difficulty = "easy";
      reason += "; eased — lower engagement";
    }
  }

  const weakCount = Number(opts.weakMasteryCount || 0);
  if (weakCount >= 2 && difficulty === "hard") {
    difficulty = "medium";
    reason += "; multiple weak topics";
  }

  return { difficulty, reason };
};

const synthesizeAdaptiveCoaching = async (snapshot, lessonMetrics) => {
  const model = process.env.GROQ_ADAPTIVE_MODEL || process.env.GROQ_STUDYPLAN_MODEL;
  const compactLessons = lessonMetrics.slice(0, 12).map((m) => ({
    id: m.lessonId,
    title: m.title,
    mastery: m.mastery,
    engagement: m.engagement,
    completed: m.completed,
    watchPct: m.watchRatio,
  }));

  const prompt = `You are an adaptive learning coach. Given learner telemetry, return ONLY valid JSON:
{
  "coachingBrief": "2-4 sentences, encouraging and specific",
  "pacing": "slower" | "standard" | "accelerated",
  "contentDensity": "foundational" | "balanced" | "stretch",
  "focusAreas": ["short label", "..."],
  "nextBestAction": {
    "type": "resume_lesson" | "next_lesson" | "review_weak" | "quiz" | "flashcards" | "rest",
    "lessonId": "<24-char hex or null>",
    "reason": "one short sentence"
  }
}

Rules:
- Align nextBestAction with the provided primaryNext when sensible.
- If engagement is low, prefer slower pacing and foundational density.
- lessonId must match one of the lesson ids below or be null.

Telemetry:
${JSON.stringify(snapshot)}

Lesson snapshot:
${JSON.stringify(compactLessons)}`;

  const raw = await chatWithGroq(
    [{ role: "system", content: "Return strictly valid JSON only." }, { role: "user", content: prompt }],
    model,
    true
  );

  let parsed;
  try {
    parsed = JSON.parse(raw || "{}");
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    parsed = m ? JSON.parse(m[0]) : {};
  }

  return {
    coachingBrief: String(parsed.coachingBrief || "").trim(),
    pacing: ["slower", "standard", "accelerated"].includes(parsed.pacing) ? parsed.pacing : "standard",
    contentDensity: ["foundational", "balanced", "stretch"].includes(parsed.contentDensity)
      ? parsed.contentDensity
      : "balanced",
    focusAreas: Array.isArray(parsed.focusAreas)
      ? parsed.focusAreas.map((s) => String(s || "").trim()).filter(Boolean).slice(0, 6)
      : [],
    nextBestAction: parsed.nextBestAction && typeof parsed.nextBestAction === "object"
      ? {
          type: String(parsed.nextBestAction.type || "next_lesson"),
          lessonId: parsed.nextBestAction.lessonId ? String(parsed.nextBestAction.lessonId) : null,
          reason: String(parsed.nextBestAction.reason || "").trim(),
        }
      : null,
  };
};

const fallbackCoaching = (primaryNext, quizDifficulty) => ({
  coachingBrief: primaryNext
    ? `Next up: ${primaryNext.title}. Your quizzes are set to ${quizDifficulty.level} difficulty — ${quizDifficulty.reason}.`
    : `Great progress. Keep a steady rhythm and revisit any lesson where quizzes felt hard.`,
  pacing: "standard",
  contentDensity: "balanced",
  focusAreas: [],
  nextBestAction: primaryNext
    ? {
        type: primaryNext.reason?.startsWith("resume") ? "resume_lesson" : "next_lesson",
        lessonId: primaryNext.lessonId,
        reason: primaryNext.reason || "Continue your path",
      }
    : null,
});

const pickPrimaryNext = (resumeLesson, nextLinearDoc, reviewLessons) => {
  if (resumeLesson && resumeLesson.watchRatio >= 10) {
    return {
      lessonId: resumeLesson.lessonId,
      title: resumeLesson.title,
      reason: "resume_in_progress",
      priority: 1,
    };
  }
  if (reviewLessons.length && reviewLessons[0].mastery < 42) {
    const w = reviewLessons[0];
    return {
      lessonId: w.lessonId,
      title: w.title,
      reason: "mastery_gap_review",
      priority: 2,
    };
  }
  if (nextLinearDoc) {
    return {
      lessonId: String(nextLinearDoc._id),
      title: nextLinearDoc.title,
      reason: "syllabus_next",
      priority: 3,
    };
  }
  return null;
};

// ─────────────────────────────────────────────
// Full snapshot for dashboard + lightweight refresh endpoint
// ─────────────────────────────────────────────
const buildAdaptiveLearningSnapshot = async (studentId, courseId, orchestratorHint = null) => {
  const [lessons, allProgress, attempts, flashAgg] = await Promise.all([
    Lesson.find({ course: courseId })
      .sort({ order: 1 })
      .select("_id title order duration module")
      .populate("module", "title"),
    Progress.find({ student: studentId, course: courseId }).populate("lesson", "title duration order"),
    QuizAttempt.find({ student: studentId, course: courseId })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("score lesson difficulty timeTaken createdAt isPassed"),
    Flashcard.aggregate([
      { $match: { student: studentId, course: courseId } },
      { $group: { _id: "$lesson", avgEase: { $avg: "$easeFactor" }, count: { $sum: 1 } } },
    ]),
  ]);

  const flashByLesson = new Map(flashAgg.map((r) => [String(r._id), { avgEase: r.avgEase, count: r.count }]));

  const progressByLesson = new Map(
    allProgress.filter((p) => p.lesson).map((p) => [String(p.lesson._id), p])
  );

  const bestQuizByLesson = new Map();
  for (const a of attempts) {
    if (!a.lesson) continue;
    const id = String(a.lesson);
    const prev = bestQuizByLesson.get(id);
    const sc = Number(a.score || 0);
    if (!prev || sc > prev) bestQuizByLesson.set(id, sc);
  }

  const lessonMetrics = lessons.map((lesson) => {
    const L = String(lesson._id);
    const prog = progressByLesson.get(L);
    const dur = Math.max(Number(lesson.duration) || 600, 1);
    const watched = prog ? Number(prog.watchedDuration) || 0 : 0;
    const watchRatio = clamp(Math.round((watched / dur) * 100), 0, 100);
    const completed = Boolean(prog?.isCompleted);
    const bestQ = bestQuizByLesson.get(L);
    const flash = flashByLesson.get(L);

    let mastery = 0;
    if (completed) mastery += 40;
    mastery += (watchRatio / 100) * 35;
    if (typeof bestQ === "number") mastery += (bestQ / 100) * 25;
    else mastery += (watchRatio / 100) * 25;
    mastery = clamp(Math.round(mastery), 0, 100);

    let engagement = 50;
    if (prog) {
      const att = prog.attentionScore;
      if (Number.isFinite(att)) engagement = clamp(att, 0, 100);
      else engagement = 72;
      if (watchRatio > 80 && !completed) engagement = clamp(engagement + 8, 0, 100);
      if (watchRatio > 0 && watchRatio < 20) engagement = clamp(engagement - 12, 0, 100);
    }

    const flashBoost =
      flash?.avgEase && flash.count > 0 ? clamp((Number(flash.avgEase) - 1.3) * 20, 0, 15) : 0;
    mastery = clamp(Math.round(mastery + flashBoost), 0, 100);

    return {
      lessonId: L,
      title: lesson.title,
      order: lesson.order,
      moduleTitle: lesson.module?.title || "",
      mastery,
      engagement,
      watchRatio,
      completed,
      hasQuizData: typeof bestQ === "number",
      bestQuizScore: bestQ ?? null,
      flashcardCount: flash?.count || 0,
    };
  });

  const completedIds = new Set(
    allProgress.filter((p) => p.isCompleted && p.lesson).map((p) => String(p.lesson._id))
  );

  const candidatesResume = lessonMetrics.filter((m) => !m.completed && m.watchRatio > 0 && m.watchRatio < 100);
  candidatesResume.sort((a, b) => b.watchRatio - a.watchRatio);
  const resumeLesson = candidatesResume[0] || null;

  const nextLinear = lessons.find((l) => !completedIds.has(String(l._id)));

  const reviewLessons = lessonMetrics
    .filter((m) => m.completed && (m.mastery < 55 || (m.hasQuizData && m.bestQuizScore < 60)))
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 4);

  const courseEngagementIndex =
    lessonMetrics.length > 0
      ? Math.round(lessonMetrics.reduce((s, m) => s + m.engagement, 0) / lessonMetrics.length)
      : 70;

  const recentAttempts = orchestratorHint?.recentAttempts?.length
    ? orchestratorHint.recentAttempts
    : attempts;

  const weakMasteryCount = lessonMetrics.filter((m) => m.mastery < 50).length;

  const quizDifficulty = analyzePerformance(recentAttempts, {
    courseEngagementIndex,
    weakMasteryCount,
  });

  const primaryNext = pickPrimaryNext(resumeLesson, nextLinear, reviewLessons);

  const snapshotForLLM = {
    courseEngagementIndex,
    streak: orchestratorHint?.streak ?? null,
    avgScore: orchestratorHint?.avgScore ?? null,
    completionPct: orchestratorHint?.completionPercentage ?? null,
    recommendedQuizDifficulty: quizDifficulty.level,
    primaryNext,
    weakLessons: reviewLessons.map((m) => ({ id: m.lessonId, title: m.title, mastery: m.mastery })),
  };

  let coaching;
  try {
    coaching = await synthesizeAdaptiveCoaching(snapshotForLLM, lessonMetrics);
    if (!coaching.coachingBrief) {
      coaching = { ...coaching, ...fallbackCoaching(primaryNext, quizDifficulty) };
    }
  } catch (e) {
    console.error("adaptiveLearning synthesizeAdaptiveCoaching:", e);
    coaching = fallbackCoaching(primaryNext, quizDifficulty);
  }

  const meanMastery = lessonMetrics.length
    ? Math.round(lessonMetrics.reduce((s, m) => s + m.mastery, 0) / lessonMetrics.length)
    : 0;

  return {
    courseEngagementIndex,
    masterySummary: {
      mean: meanMastery,
      weakest: reviewLessons[0] || null,
      weakLessonCount: weakMasteryCount,
    },
    lessonMetrics: lessonMetrics.slice(0, 40),
    personalizedPath: {
      primaryNext,
      reviewQueue: reviewLessons,
      resumeLesson,
    },
    quizDifficulty: { level: quizDifficulty.difficulty, reason: quizDifficulty.reason },
    pacing: coaching.pacing,
    contentDensity: coaching.contentDensity,
    focusAreas: coaching.focusAreas,
    coachingBrief: coaching.coachingBrief,
    nextBestAction: coaching.nextBestAction,
  };
};

// Quick signals for quiz endpoint (no LLM) — attention-based engagement nudges difficulty
const getAdaptiveQuizSignals = async (studentId, courseId, recentAttempts) => {
  const engagementAgg = await Progress.aggregate([
    {
      $match: {
        student: studentId,
        course: courseId,
        watchedDuration: { $gt: 0 },
      },
    },
    {
      $group: {
        _id: null,
        avgAtt: { $avg: "$attentionScore" },
        n: { $sum: 1 },
      },
    },
  ]);

  let courseEngagementIndex;
  const row = engagementAgg[0];
  if (row?.n > 0 && Number.isFinite(row.avgAtt)) {
    courseEngagementIndex = Math.round(row.avgAtt);
  }

  const { difficulty, reason } = analyzePerformance(recentAttempts, {
    courseEngagementIndex,
  });

  return { difficulty, reason, courseEngagementIndex };
};

export {
  analyzePerformance,
  buildAdaptiveLearningSnapshot,
  getAdaptiveQuizSignals,
};
