import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    selectedIndex: {
      type: Number,
      required: true,
      min: 0,
      max: 3,
    },
    isCorrect: {
      type: Boolean,
      required: true,
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
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
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
  },
  {
    timestamps: true,
  }
);

// fast lookup: all attempts by a student for a quiz
quizAttemptSchema.index({ student: 1, quiz: 1 });

export const QuizAttempt = mongoose.model("QuizAttempt", quizAttemptSchema);