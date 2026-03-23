import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    issuedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    hash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    previousHash: {
      type: String,
      required: true,
      default: "GENESIS",
    },
    qrCodeUrl: {
      type: String,
      required: true,
    },
    onChainTxHash: {
      type: String,
      default: null,
      index: true,
    },
    onChainBlockNumber: {
      type: Number,
      default: null,
    },
    onChainContractAddress: {
      type: String,
      default: null,
    },
    onChainChainId: {
      type: Number,
      default: null,
    },
    onChainIssuerAddress: {
      type: String,
      default: null,
    },
    onChainExplorerUrl: {
      type: String,
      default: null,
    },
    onChainRecipientIdHash: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

certificateSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export const Certificate = mongoose.model("Certificate", certificateSchema);
