import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    selectedIndex: {
      type: Number,
      min: 0,
      default: null,
    },
    answerText: {
      type: String,
      trim: true,
      default: "",
    },
    isCorrect: {
      type: Boolean,
      required: true,
    },
  },
  { _id: false }
);

const assignedQuestionSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    type: {
      type: String,
      enum: ["mcq", "brief", "descriptive"],
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    options: {
      type: [String],
      default: [],
    },
    marks: {
      type: Number,
      min: 1,
      default: 1,
    },
  },
  { _id: false }
);

const activityLogSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      enum: [
        "copy",
        "paste",
        "selection",
        "click",
        "fullscreen_exit",
        "visibility_hidden",
        "context_menu",
      ],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    meta: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const quizAttemptSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
    },
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      default: null,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
    },
    quizBank: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "QuizBank",
      default: null,
    },
    assignedQuestions: {
      type: [assignedQuestionSchema],
      default: [],
    },
    answers: [answerSchema],
    score: {
      type: Number,
      required: true, // percentage 0-100
      min: 0,
      max: 100,
    },
    isPassed: {
      type: Boolean,
      required: true,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true, // difficulty level of this attempt
    },
    attemptNumber: {
      type: Number,
      required: true, // 1st, 2nd, 3rd attempt
      default: 1,
    },
    timeTaken: {
      type: Number,
      default: 0, // seconds taken to complete
    },
    warningCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    activityLogs: {
      type: [activityLogSchema],
      default: [],
    },
    isTerminatedForCheating: {
      type: Boolean,
      default: false,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// fast lookup: all attempts by a student for a quiz
quizAttemptSchema.index({ student: 1, quiz: 1 });

export const QuizAttempt = mongoose.models.QuizAttempt || mongoose.model("QuizAttempt", quizAttemptSchema);