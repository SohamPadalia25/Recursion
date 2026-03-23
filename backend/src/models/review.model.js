import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
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
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
    },
    isFlagged: {
      type: Boolean,
      default: false, // admin flagged for review
    },
  },
  {
    timestamps: true,
  }
);

// one review per student per course
reviewSchema.index({ student: 1, course: 1 }, { unique: true });

// after save/delete — update course averageRating
reviewSchema.post("save", async function () {
  const Review = this.constructor;
  const result = await Review.aggregate([
    { $match: { course: this.course } },
    { $group: { _id: "$course", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  if (result.length > 0) {
    const { default: mongoose } = await import("mongoose");
    await mongoose.model("Course").findByIdAndUpdate(this.course, {
      averageRating: Math.round(result[0].avg * 10) / 10,
      totalReviews: result[0].count,
    });
  }
});

export const Review = mongoose.model("Review", reviewSchema);