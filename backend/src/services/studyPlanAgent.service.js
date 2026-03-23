// STUDY PLAN AGENT
// Creates a personalized study schedule from a student's goal + deadline
// Auto-replans when student falls behind (called by orchestrator)

import { chatWithGroq } from "./groq.service.js";
import { StudyPlan } from "../models/studyPlan.model.js";
import { Lesson } from "../models/lesson.model.js";
import { Progress } from "../models/progress.model.js";
import { Notification } from "../models/notification.model.js";

// ─────────────────────────────────────────────
// CREATE INITIAL STUDY PLAN
// Called on enrollment when student sets goal
// ─────────────────────────────────────────────
const createStudyPlan = async ({ studentId, courseId, goalText, deadline }) => {
  // Get all lessons in the course
  const lessons = await Lesson.find({ course: courseId })
    .sort({ order: 1 })
    .select("_id title duration order");

  // Get already completed lessons
  const completed = await Progress.find({
    student: studentId,
    course: courseId,
    isCompleted: true,
  }).select("lesson");

  const completedIds = new Set(completed.map((p) => p.lesson.toString()));
  const remainingLessons = lessons.filter((l) => !completedIds.has(l._id.toString()));

  if (remainingLessons.length === 0) {
    throw new Error("All lessons already completed");
  }

  // Ask LLM to build the schedule
  const deadlineDate = new Date(deadline);
  const today = new Date();
  const daysAvailable = Math.max(
    1,
    Math.floor((deadlineDate - today) / (1000 * 60 * 60 * 24))
  );

  const lessonSummary = remainingLessons.map((l, i) => ({
    index: i + 1,
    title: l.title,
    durationMins: Math.round((l.duration || 600) / 60),
  }));

  const prompt = `
You are a study plan creator. A student wants to complete ${remainingLessons.length} lessons in ${daysAvailable} days.

Student's goal: "${goalText}"
Deadline: ${deadlineDate.toDateString()}
Lessons to cover:
${JSON.stringify(lessonSummary, null, 2)}

Create a day-by-day plan. Assign 1-3 lessons per day depending on lesson count and available days.
Skip weekends if possible (mark them as rest days).
Return ONLY valid JSON:
{
  "dailyPlan": [
    {
      "dayOffset": 0,
      "lessonIndexes": [1, 2],
      "estimatedMins": 45,
      "note": "Light start"
    }
  ]
}
`;

  const raw = await chatWithGroq(
    [{ role: "user", content: prompt }],
    "llama3-8b-8192",
    true
  );

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(match[0]);
  }

  // Convert LLM response to dailyTasks with actual dates and lesson IDs
  const dailyTasks = parsed.dailyPlan.map((day) => {
    const taskDate = new Date(today);
    taskDate.setDate(today.getDate() + day.dayOffset);

    const lessons = (day.lessonIndexes || [])
      .map((idx) => remainingLessons[idx - 1]?._id)
      .filter(Boolean);

    return {
      date: taskDate,
      lessons,
      estimatedMins: day.estimatedMins || 30,
      isCompleted: false,
    };
  });

  // Upsert (replace if exists)
  const plan = await StudyPlan.findOneAndUpdate(
    { student: studentId, course: courseId },
    {
      student: studentId,
      course: courseId,
      goalText,
      deadline: deadlineDate,
      dailyTasks,
      isActive: true,
      replanCount: 0,
    },
    { upsert: true, new: true }
  );

  return plan;
};

// ─────────────────────────────────────────────
// REPLAN AGENT
// Called automatically when student is behind schedule
// ─────────────────────────────────────────────
const runStudyPlanAgent = async (studentId, courseId, trigger = "manual") => {
  const plan = await StudyPlan.findOne({
    student: studentId,
    course: courseId,
    isActive: true,
  });

  if (!plan) return null;

  // Get remaining uncompleted lessons
  const completed = await Progress.find({
    student: studentId,
    course: courseId,
    isCompleted: true,
  }).select("lesson");

  const completedIds = new Set(completed.map((p) => p.lesson.toString()));

  const allLessons = await Lesson.find({ course: courseId })
    .sort({ order: 1 })
    .select("_id title duration order");

  const remainingLessons = allLessons.filter(
    (l) => !completedIds.has(l._id.toString())
  );

  if (remainingLessons.length === 0) {
    plan.isActive = false;
    await plan.save();
    return { message: "All lessons completed — plan deactivated" };
  }

  const today = new Date();
  const deadline = new Date(plan.deadline);
  const daysLeft = Math.max(
    1,
    Math.floor((deadline - today) / (1000 * 60 * 60 * 24))
  );

  // Rebuild daily tasks for remaining lessons
  const lessonsPerDay = Math.ceil(remainingLessons.length / daysLeft);

  const newDailyTasks = [];
  let lessonIdx = 0;

  for (let d = 0; d < daysLeft && lessonIdx < remainingLessons.length; d++) {
    const taskDate = new Date(today);
    taskDate.setDate(today.getDate() + d);

    const batchLessons = [];
    for (let i = 0; i < lessonsPerDay && lessonIdx < remainingLessons.length; i++) {
      batchLessons.push(remainingLessons[lessonIdx]._id);
      lessonIdx++;
    }

    const totalMins = batchLessons.reduce((sum, lid) => {
      const l = remainingLessons.find((r) => r._id.toString() === lid.toString());
      return sum + Math.round((l?.duration || 600) / 60);
    }, 0);

    newDailyTasks.push({
      date: taskDate,
      lessons: batchLessons,
      estimatedMins: totalMins,
      isCompleted: false,
    });
  }

  plan.dailyTasks = newDailyTasks;
  plan.lastReplanAt = new Date();
  plan.replanCount = (plan.replanCount || 0) + 1;
  await plan.save();

  // Notify student about the replan
  await Notification.create({
    recipient: studentId,
    type: "plan_replan",
    message: `Your study plan was auto-updated (${trigger === "behind_schedule" ? "you were behind schedule" : "manual replan"}). ${remainingLessons.length} lessons left in ${daysLeft} days.`,
    link: `/study-plan`,
    relatedCourse: courseId,
  });

  return {
    replanned: true,
    lessonsRemaining: remainingLessons.length,
    daysLeft,
    trigger,
    replanCount: plan.replanCount,
  };
};

export { createStudyPlan, runStudyPlanAgent };