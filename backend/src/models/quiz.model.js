import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    options: {
      type: [String],
      validate: {
        validator: function (arr) {
          return arr.length === 4;
        },
        message: "Each question must have exactly 4 options",
      },
      required: true,
    },
    correctIndex: {
      type: Number,
      required: true,
      min: 0,
      max: 3, // index of the correct option in options array
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    explanation: {
      type: String, // shown to student after wrong answer
      trim: true,
    },
  },
  { _id: true }
);

const quizSchema = new mongoose.Schema(
  {
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    questions: [questionSchema],
    passingScore: {
      type: Number,
      default: 60, // percentage required to pass
      min: 0,
      max: 100,
    },
    isAIGenerated: {
      type: Boolean,
      default: false,
    },
    currentDifficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium", // adaptive engine updates this per student
    },
  },
  {
    timestamps: true,
  }
);

// one quiz per lesson
quizSchema.index({ lesson: 1 }, { unique: true });

export const Quiz = mongoose.model("Quiz", quizSchema);