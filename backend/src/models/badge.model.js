import mongoose from "mongoose";

const badgeSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "first_quiz",        // completed first quiz
        "quiz_master",       // scored 100% on a quiz
        "streak_7",          // 7-day login streak
        "streak_30",         // 30-day login streak
        "module_complete",   // completed a full module
        "course_complete",   // completed a full course
        "fast_learner",      // finished course ahead of deadline
        "top_performer",     // ranked #1 in course leaderboard
        "helpful_peer",      // most upvoted in discussion forum
      ],
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null, // some badges are course-specific, some are platform-wide
    },
    awardedAt: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed, // e.g. { streakCount: 7 } or { score: 100 }
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// fast lookup: all badges for a student
badgeSchema.index({ student: 1 });

export const Badge = mongoose.model("Badge", badgeSchema);