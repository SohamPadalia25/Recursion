import mongoose from "mongoose";

const moduleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    order: {
      type: Number,
      required: true, // position in the course (1, 2, 3...)
    },
    isLocked: {
      type: Boolean,
      default: false, // locked until prerequisite is completed
    },
    prerequisiteModule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      default: null, // null means no prerequisite
    },
  },
  {
    timestamps: true,
  }
);

// ensure order is unique within a course
moduleSchema.index({ course: 1, order: 1 }, { unique: true });

export const Module = mongoose.model("Module", moduleSchema);