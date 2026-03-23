// BADGE AGENT
// Runs non-blocking after every lesson completion or quiz attempt
// Checks conditions and awards badges automatically

import { Badge } from "../models/badge.model.js";
import { Notification } from "../models/notification.model.js";

const BADGE_CONDITIONS = {
  first_quiz: async (studentId, courseId, context) => {
    const total = context.recentAttempts?.length || 0;
    const alreadyHas = await Badge.exists({ student: studentId, type: "first_quiz" });
    return total >= 1 && !alreadyHas;
  },
  streak_7: async (studentId, courseId, context) => {
    const streak = context.streak || 0;
    const alreadyHas = await Badge.exists({ student: studentId, type: "streak_7" });
    return streak >= 7 && !alreadyHas;
  },
  streak_30: async (studentId, courseId, context) => {
    const streak = context.streak || 0;
    const alreadyHas = await Badge.exists({ student: studentId, type: "streak_30" });
    return streak >= 30 && !alreadyHas;
  },
  course_complete: async (studentId, courseId, context) => {
    const pct = context.completionPercentage || 0;
    const alreadyHas = await Badge.exists({
      student: studentId,
      type: "course_complete",
      course: courseId,
    });
    return pct >= 100 && !alreadyHas;
  },
  quiz_master: async (studentId, courseId, context) => {
    const perfect = context.recentAttempts?.some((a) => a.score === 100);
    const alreadyHas = await Badge.exists({
      student: studentId,
      type: "quiz_master",
      course: courseId,
    });
    return perfect && !alreadyHas;
  },
};

const runBadgeAgent = async (studentId, courseId, context) => {
  const awarded = [];

  for (const [type, checkFn] of Object.entries(BADGE_CONDITIONS)) {
    try {
      const shouldAward = await checkFn(studentId, courseId, context);
      if (shouldAward) {
        const badge = await Badge.create({
          student: studentId,
          type,
          course: courseId,
          awardedAt: new Date(),
          metadata: { streak: context.streak, score: context.avgScore },
        });

        await Notification.create({
          recipient: studentId,
          type: "badge_earned",
          message: `You earned the "${type.replace("_", " ")}" badge!`,
          link: `/profile/badges`,
          relatedCourse: courseId,
        });

        awarded.push(badge);
      }
    } catch (err) {
      console.error(`Badge check failed for ${type}:`, err.message);
    }
  }

  return awarded;
};

export { runBadgeAgent };