import mongoose from "mongoose";

const quizAttemptReportSchema = new mongoose.Schema(
  {
    attempt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "QuizAttempt",
      required: true,
      unique: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "ready", "failed"],
      default: "pending",
      index: true,
    },
    telemetry: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    report: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    error: {
      type: String,
      trim: true,
      default: "",
    },
    generatedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export const QuizAttemptReport =
  mongoose.models.QuizAttemptReport || mongoose.model("QuizAttemptReport", quizAttemptReportSchema);

