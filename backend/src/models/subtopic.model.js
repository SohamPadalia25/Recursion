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

const subtopicSchema = new mongoose.Schema(
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
    topic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Topic",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      required: true,
    },
    order: {
      type: Number,
      required: true, // position within topic
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
        ref: "Subtopic",
      },
    ],
    // Alternate paths if prerequisite not met
    alternatePaths: [
      {
        condition: String,
        suggestedSubtopicId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Subtopic",
        },
        description: String,
      },
    ],
    estimatedDuration: {
      type: Number,
      default: 0, // duration in minutes
    },
    isOptional: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure order is unique within a topic
subtopicSchema.index({ topic: 1, order: 1 }, { unique: true });

// Create index for finding subtopics by course
subtopicSchema.index({ course: 1 });

export const Subtopic = mongoose.model("Subtopic", subtopicSchema);
