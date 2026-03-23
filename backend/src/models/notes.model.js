import mongoose from "mongoose";

const notesSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    callId: {
      type: String,
      default: null,
    },
    roomName: {
      type: String,
      default: null,
    },
    title: {
      type: String,
      default: "Class Notes",
    },
    content: {
      type: String,
      required: true,
    },
    sessionDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for quick lookups
notesSchema.index({ studentId: 1, createdAt: -1 });
notesSchema.index({ callId: 1 });

export default mongoose.model("Notes", notesSchema);
