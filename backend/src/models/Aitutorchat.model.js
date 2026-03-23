import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const aiTutorChatSchema = new mongoose.Schema(
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
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      default: null, // null = general course doubt, not lesson-specific
    },
    messages: [messageSchema],
    sessionId: {
      type: String,
      required: true,
      unique: true, // one unique session id per chat session
    },
    isFlagged: {
      type: Boolean,
      default: false, // student clicked thumbs down — admin reviews
    },
    flagReason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// fast lookup: all chats for a student in a course
aiTutorChatSchema.index({ student: 1, course: 1 });

export const AITutorChat = mongoose.model("AITutorChat", aiTutorChatSchema);