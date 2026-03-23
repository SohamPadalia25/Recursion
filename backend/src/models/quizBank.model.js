import mongoose from "mongoose";

const quizBankQuestionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["mcq", "brief", "descriptive"],
      default: "mcq",
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    options: {
      type: [String],
      default: [],
      validate: {
        validator: function (arr) {
          return this.type !== "mcq" || arr.length >= 2;
        },
        message: "MCQ questions must contain at least 2 options",
      },
    },
    correctIndex: {
      type: Number,
      default: null,
    },
    expectedAnswer: {
      type: String,
      trim: true,
      default: "",
    },
    explanation: {
      type: String,
      trim: true,
      default: "",
    },
    marks: {
      type: Number,
      min: 1,
      default: 1,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
  },
  { _id: true }
);

const distributionSchema = new mongoose.Schema(
  {
    questionsPerStudent: {
      type: Number,
      min: 1,
      default: 10,
    },
    mcqCount: {
      type: Number,
      min: 0,
      default: 6,
    },
    briefCount: {
      type: Number,
      min: 0,
      default: 3,
    },
    descriptiveCount: {
      type: Number,
      min: 0,
      default: 1,
    },
    easyCount: {
      type: Number,
      min: 0,
      default: 3,
    },
    mediumCount: {
      type: Number,
      min: 0,
      default: 5,
    },
    hardCount: {
      type: Number,
      min: 0,
      default: 2,
    },
    strategy: {
      type: String,
      enum: ["balanced", "random"],
      default: "balanced",
    },
  },
  { _id: false }
);

const quizBankSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
    },
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      default: null,
    },
    sourceType: {
      type: String,
      enum: ["manual", "auto", "prompt", "pdf"],
      default: "manual",
    },
    generationPrompt: {
      type: String,
      trim: true,
      default: "",
    },
    questions: {
      type: [quizBankQuestionSchema],
      default: [],
    },
    distribution: {
      type: distributionSchema,
      default: () => ({}),
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    maxWarnings: {
      type: Number,
      min: 1,
      default: 3,
    },
  },
  { timestamps: true }
);

quizBankSchema.index({ instructor: 1, createdAt: -1 });
quizBankSchema.index({ isPublished: 1, createdAt: -1 });

export const QuizBank = mongoose.model("QuizBank", quizBankSchema);
