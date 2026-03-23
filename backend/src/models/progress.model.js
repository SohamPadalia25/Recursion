import mongoose from "mongoose";

const progressSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      required: true,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    watchedDuration: {
      type: Number,
      default: 0, // seconds watched so far
    },
    completedAt: {
      type: Date,
      default: null,
    },
    attentionScore: {
      type: Number,
      default: null, // 0-100, computed from CV attention proctoring
      min: 0,
      max: 100,
    },
    lastWatchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// one progress record per student per lesson
progressSchema.index({ student: 1, lesson: 1 }, { unique: true });

// fast lookup: all progress for a student in a course
progressSchema.index({ student: 1, course: 1 });

export const Progress = mongoose.model("Progress", progressSchema);