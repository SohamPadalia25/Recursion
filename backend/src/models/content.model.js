import mongoose from "mongoose";

const contentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["video", "pdf", "notes", "link", "code", "interactive", "quiz"],
      required: true,
    },
    url: {
      type: String,
      required: true, // cloudinary, youtube, github, etc.
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    // Can be attached to either topic or subtopic
    topic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Topic",
      default: null,
    },
    subtopic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subtopic",
      default: null,
    },
    // Fallback to lesson for backward compatibility
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      default: null,
    },
    // Metadata
    duration: {
      type: Number,
      default: 0, // duration in seconds
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    description: {
      type: String,
      trim: true,
    },
    order: {
      type: Number,
      default: 0, // ordering within topic/subtopic
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    transcript: {
      type: String, // for videos, auto-generated
      default: "",
    },
    thumbnail: {
      type: String, // preview image for videos/content
    },
    sizeInBytes: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for efficient queries
contentSchema.index({ course: 1 });
contentSchema.index({ topic: 1 });
contentSchema.index({ subtopic: 1 });
contentSchema.index({ lesson: 1 });

// Ensure either topic, subtopic, or lesson is set
contentSchema.pre("save", function () {
  if (!this.topic && !this.subtopic && !this.lesson) {
    throw new Error("Content must be attached to a topic, subtopic, or lesson");
  }
});

export const Content = mongoose.model("Content", contentSchema);
