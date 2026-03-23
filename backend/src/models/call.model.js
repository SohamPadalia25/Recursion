import mongoose from "mongoose";

const callSchema = new mongoose.Schema(
  {
    callerId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    callerName: {
      type: String,
      required: true,
      trim: true,
    },
    callerRole: {
      type: String,
      default: "student",
      trim: true,
    },
    calleeId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    calleeName: {
      type: String,
      trim: true,
    },
    calleeRole: {
      type: String,
      default: "instructor",
      trim: true,
    },
    roomName: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["ringing", "accepted", "rejected", "ended"],
      default: "ringing",
    },
    startedAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

callSchema.index({ callerId: 1, createdAt: -1 });
callSchema.index({ calleeId: 1, createdAt: -1 });
callSchema.index({ roomName: 1 });

const Call = mongoose.model("Call", callSchema);

export default Call;
