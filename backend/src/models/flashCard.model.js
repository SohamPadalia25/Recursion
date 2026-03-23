import mongoose from "mongoose";

const flashcardSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
    },
    isAIGenerated: {
      type: Boolean,
      default: true,
    },
    // SM-2 spaced repetition algorithm fields
    nextReviewAt: {
      type: Date,
      default: Date.now, // due immediately after creation
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    easeFactor: {
      type: Number,
      default: 2.5, // SM-2 starts at 2.5, min 1.3
      min: 1.3,
    },
    interval: {
      type: Number,
      default: 1, // days until next review
    },
    lastReviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// fast lookup: all flashcards due today for a student
flashcardSchema.index({ student: 1, nextReviewAt: 1 });

export const Flashcard = mongoose.model("Flashcard", flashcardSchema);