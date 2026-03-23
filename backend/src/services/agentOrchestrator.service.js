// AGENTIC ORCHESTRATOR
// This is the brain. When a student opens the dashboard,
// this runs multiple agents in sequence and returns a unified context.

import { Progress } from "../models/progress.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import { StudyPlan } from "../models/studyPlan.model.js";
import { QuizAttempt } from "../models/quizAttempt.model.js";
import { Flashcard } from "../models/flashcard.model.js";
import { Notification } from "../models/notification.model.js";
import { Lesson } from "../models/lesson.model.js";
import { runStudyPlanAgent } from "./studyPlanAgent.service.js";
import { runBadgeAgent } from "./badgeAgent.service.js";

// ─────────────────────────────────────────────
// AGENT 1: Context Loader
// Loads everything the student has done
// ─────────────────────────────────────────────
const loadStudentContext = async (studentId, courseId) => {
  const [enrollment, completedLessons, studyPlan, recentAttempts] = await Promise.all([
    Enrollment.findOne({ student: studentId, course: courseId })
      .populate("course", "title totalDuration"),

    Progress.find({ student: studentId, course: courseId, isCompleted: true })
      .select("lesson completedAt attentionScore watchedDuration")
      .populate("lesson", "title duration order"),

    StudyPlan.findOne({ student: studentId, course: courseId, isActive: true }),

    QuizAttempt.find({ student: studentId, course: courseId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("score isPassed difficulty lesson createdAt"),
  ]);

  // compute streak from completedLessons
  const streak = computeStreak(completedLessons);

  // compute avg score from last 5 attempts
  const avgScore =
    recentAttempts.length > 0
      ? Math.round(
          recentAttempts.slice(0, 5).reduce((s, a) => s + a.score, 0) /
            Math.min(5, recentAttempts.length)
        )
      : null;

  return {
    enrollment,
    completedLessons,
    studyPlan,
    recentAttempts,
    streak,
    avgScore,
    completionPercentage: enrollment?.completionPercentage || 0,
  };
};

// ─────────────────────────────────────────────
// AGENT 2: Next Lesson Picker
// Finds the next lesson the student should do
// ─────────────────────────────────────────────
const pickNextLesson = async (studentId, courseId, completedLessons) => {
  const completedIds = completedLessons.map((p) => p.lesson?._id?.toString());

  const nextLesson = await Lesson.findOne({
    course: courseId,
    _id: { $nin: completedIds },
  })
    .sort({ order: 1 })
    .populate("module", "title");

  return nextLesson;
};

// ─────────────────────────────────────────────
// AGENT 3: Due Flashcards Checker
// Returns flashcards due for review today
// ─────────────────────────────────────────────
const checkDueFlashcards = async (studentId, courseId) => {
  const now = new Date();
  const dueCards = await Flashcard.find({
    student: studentId,
    course: courseId,
    nextReviewAt: { $lte: now },
  })
    .limit(20)
    .select("question answer easeFactor interval");

  return dueCards;
};

// ─────────────────────────────────────────────
// AGENT 4: Performance Analyzer
// Decides what difficulty to set for the next quiz
// ─────────────────────────────────────────────
const analyzePerformance = (recentAttempts) => {
  if (recentAttempts.length === 0) return { difficulty: "medium", reason: "no attempts yet" };

  const last3 = recentAttempts.slice(0, 3);
  const avgLast3 = last3.reduce((s, a) => s + a.score, 0) / last3.length;

  if (avgLast3 >= 85) {
    return { difficulty: "hard", reason: `avg score ${Math.round(avgLast3)}% — escalating` };
  } else if (avgLast3 < 50) {
    return { difficulty: "easy", reason: `avg score ${Math.round(avgLast3)}% — needs support` };
  } else {
    return { difficulty: "medium", reason: `avg score ${Math.round(avgLast3)}% — on track` };
  }
};

// ─────────────────────────────────────────────
// AGENT 5: Schedule Health Checker
// Checks if student is behind and triggers replan
// ─────────────────────────────────────────────
const checkScheduleHealth = async (studentId, courseId, studyPlan) => {
  if (!studyPlan) return { status: "no_plan", daysBehing: 0 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // count tasks due before today that aren't completed
  const overdueTasks = studyPlan.dailyTasks.filter((task) => {
    const taskDate = new Date(task.date);
    taskDate.setHours(0, 0, 0, 0);
    return taskDate < today && !task.isCompleted;
  });

  const daysBehind = overdueTasks.length;

  if (daysBehind > 1) {
    // Trigger the study plan replan agent
    const replanned = await runStudyPlanAgent(studentId, courseId, "behind_schedule");
    return { status: "replanned", daysBehind, replanned };
  }

  return { status: "on_track", daysBehind };
};

// ─────────────────────────────────────────────
// AGENT 6: Notification Generator
// Creates smart notifications based on state
// ─────────────────────────────────────────────
const generateNotifications = async (studentId, context) => {
  const notifications = [];

  // streak milestone
  if (context.streak === 7 || context.streak === 30) {
    notifications.push({
      recipient: studentId,
      type: "badge_earned",
      message: `You hit a ${context.streak}-day streak! Keep going!`,
      link: `/dashboard`,
    });
  }

  // due flashcards reminder
  if (context.dueFlashcards?.length > 0) {
    notifications.push({
      recipient: studentId,
      type: "quiz_due",
      message: `You have ${context.dueFlashcards.length} flashcards due for review today.`,
      link: `/flashcards`,
    });
  }

  // study plan replanned
  if (context.scheduleHealth?.status === "replanned") {
    notifications.push({
      recipient: studentId,
      type: "plan_replan",
      message: `You were ${context.scheduleHealth.daysBehind} days behind — your study plan has been auto-updated.`,
      link: `/study-plan`,
    });
  }

  if (notifications.length > 0) {
    await Notification.insertMany(notifications);
  }

  return notifications;
};

// ─────────────────────────────────────────────
// MASTER ORCHESTRATOR
// Called once when student opens dashboard
// Runs all agents and returns unified state
// ─────────────────────────────────────────────
const runDashboardAgents = async (studentId, courseId) => {
  // Run context loader first (everything depends on this)
  const context = await loadStudentContext(studentId, courseId);

  // Run remaining agents in parallel where possible
  const [nextLesson, dueFlashcards, scheduleHealth] = await Promise.all([
    pickNextLesson(studentId, courseId, context.completedLessons),
    checkDueFlashcards(studentId, courseId),
    checkScheduleHealth(studentId, courseId, context.studyPlan),
  ]);

  const performanceAnalysis = analyzePerformance(context.recentAttempts);

  // Check for badges earned (runs async, don't await — non-blocking)
  runBadgeAgent(studentId, courseId, context).catch(console.error);

  const fullContext = {
    ...context,
    nextLesson,
    dueFlashcards,
    scheduleHealth,
    performanceAnalysis,
  };

  // Generate and store notifications
  const notifications = await generateNotifications(studentId, fullContext);

  return {
    student: studentId,
    course: courseId,
    // What student sees on dashboard
    nextLesson,
    completionPercentage: context.completionPercentage,
    streak: context.streak,
    avgScore: context.avgScore,
    dueFlashcardsCount: dueFlashcards.length,
    dueFlashcards,
    todayTasks: getTodayTasks(context.studyPlan),
    scheduleHealth,
    performanceAnalysis, // used by quiz agent to pick difficulty
    newNotifications: notifications,
    recentAttempts: context.recentAttempts.slice(0, 5),
  };
};

// ─── Helpers ───────────────────────────────
const computeStreak = (completedLessons) => {
  if (!completedLessons.length) return 0;
  const dates = [
    ...new Set(
      completedLessons.map((p) =>
        new Date(p.completedAt).toISOString().split("T")[0]
      )
    ),
  ].sort((a, b) => new Date(b) - new Date(a));

  let streak = 0;
  const today = new Date().toISOString().split("T")[0];
  let check = today;

  for (const d of dates) {
    if (d === check) {
      streak++;
      const prev = new Date(check);
      prev.setDate(prev.getDate() - 1);
      check = prev.toISOString().split("T")[0];
    } else break;
  }
  return streak;
};

const getTodayTasks = (studyPlan) => {
  if (!studyPlan) return [];
  const today = new Date().toISOString().split("T")[0];
  return studyPlan.dailyTasks.filter(
    (t) => new Date(t.date).toISOString().split("T")[0] === today
  );
};

export { runDashboardAgents, analyzePerformance };