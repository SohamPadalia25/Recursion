import mongoose from "mongoose";

const learningOutcomeSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
      trim: true,
    },
    bloomLevel: {
      type: String,
      enum: ["remember", "understand", "apply", "analyze", "evaluate", "create"],
      default: "understand",
    },
  },
  { _id: false }
);

const topicSchema = new mongoose.Schema(
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
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    order: {
      type: Number,
      required: true, // position within module
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    learningOutcomes: [learningOutcomeSchema],
    prerequisites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Topic",
      },
    ],
    // Alternate learning paths
    alternatePaths: [
      {
        condition: String, // e.g., "if_prerequisite_not_met", "if_fast_learner"
        suggestedTopicId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Topic",
        },
        description: String,
      },
    ],
    estimatedDuration: {
      type: Number,
      default: 0, // duration in minutes
    },
    estimatedLearnerCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure order is unique within a module
topicSchema.index({ module: 1, order: 1 }, { unique: true });

// Create index for finding topics by course
topicSchema.index({ course: 1 });

export const Topic = mongoose.model("Topic", topicSchema);
