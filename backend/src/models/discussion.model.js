import mongoose from "mongoose";

const discussionSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      default: null, // null = general course discussion
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    parentPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Discussion",
      default: null, // null = top-level post, set = reply to another post
    },
    upvotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isPinned: {
      type: Boolean,
      default: false, // instructor can pin important posts
    },
    isDeleted: {
      type: Boolean,
      default: false, // soft delete — keep for moderation logs
    },
  },
  {
    timestamps: true,
  }
);

// fast lookup: all posts in a course lesson
discussionSchema.index({ course: 1, lesson: 1 });

export const Discussion = mongoose.model("Discussion", discussionSchema);