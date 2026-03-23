import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "quiz_due",        // adaptive quiz ready after lesson
        "plan_replan",     // study plan was auto-replanned
        "plan_reminder",   // daily study reminder
        "badge_earned",    // new badge awarded
        "announcement",    // instructor announcement
        "course_approved", // admin approved instructor's course
        "course_rejected", // admin rejected instructor's course
        "enrollment",      // someone enrolled in your course (instructor)
        "certificate",     // course completion certificate ready
      ],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    link: {
      type: String, // frontend deep link e.g. /courses/:id/lesson/:id
      default: null,
    },
    relatedCourse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// fast lookup: all unread notifications for a user
notificationSchema.index({ recipient: 1, isRead: 1 });

export const Notification = mongoose.model("Notification", notificationSchema);