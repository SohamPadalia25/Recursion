import mongoose from "mongoose";

const dailyTaskSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    lessons: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lesson",
      },
    ],
    estimatedMins: {
      type: Number,
      default: 30,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const studyPlanSchema = new mongoose.Schema(
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
    goalText: {
      type: String,
      required: true,
      trim: true, // e.g. "I want to finish this in 3 weeks"
    },
    deadline: {
      type: Date,
      required: true,
    },
    dailyTasks: [dailyTaskSchema],
    lastReplanAt: {
      type: Date,
      default: null, // set whenever agent rebuilds the plan
    },
    replanCount: {
      type: Number,
      default: 0, // how many times agent has replanned
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// one active study plan per student per course
studyPlanSchema.index({ student: 1, course: 1 }, { unique: true });

export const StudyPlan = mongoose.model("StudyPlan", studyPlanSchema);