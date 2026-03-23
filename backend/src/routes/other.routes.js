import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/role.middleware.js";
import {
    enrollInCourse, getMyEnrollments, getCourseStudents, checkEnrollment, unenroll,
} from "../controllers/enrollment.controller.js";
import {
    markLessonComplete, updateWatchTime, getCourseProgress, getStudentProgress, saveAttentionScore,
} from "../controllers/progress.controller.js";
import {
    createPost, getDiscussions, getReplies, toggleUpvote, pinPost, deletePost,
} from "../controllers/discussion.controller.js";
import {
    createReview, getCourseReviews, deleteReview,
} from "../controllers/review.controller.js";
import {
    getMyNotifications, markAsRead, markAllAsRead, deleteNotification,
} from "../controllers/notification.controller.js";
import {
    getPlatformStats, getAllUsers, changeUserRole, getPendingCourses,
    approveCourse, unpublishCourse, getFlaggedChats, getAIUsageStats, getAllCoursesAdmin,
} from "../controllers/admin.controller.js";

// ── ENROLLMENT ───────────────────────────────────────────────
export const enrollmentRouter = Router();
enrollmentRouter.route("/").post(verifyJWT, enrollInCourse);
enrollmentRouter.route("/my").get(verifyJWT, getMyEnrollments);
enrollmentRouter.route("/status/:courseId").get(verifyJWT, checkEnrollment);
enrollmentRouter.route("/course/:courseId/students").get(verifyJWT, getCourseStudents);
enrollmentRouter.route("/:courseId").delete(verifyJWT, unenroll);

// ── PROGRESS ─────────────────────────────────────────────────
export const progressRouter = Router();
progressRouter.route("/lesson/:lessonId/complete").post(verifyJWT, markLessonComplete);
progressRouter.route("/lesson/:lessonId/watch").patch(verifyJWT, updateWatchTime);
progressRouter.route("/lesson/:lessonId/attention").patch(verifyJWT, saveAttentionScore);
progressRouter.route("/course/:courseId").get(verifyJWT, getCourseProgress);
progressRouter.route("/student/:studentId/course/:courseId").get(verifyJWT, getStudentProgress);

// ── DISCUSSIONS ──────────────────────────────────────────────
export const discussionRouter = Router();
discussionRouter.route("/").post(verifyJWT, createPost);
discussionRouter.route("/:courseId").get(verifyJWT, getDiscussions);
discussionRouter.route("/replies/:postId").get(verifyJWT, getReplies);
discussionRouter.route("/:postId/upvote").patch(verifyJWT, toggleUpvote);
discussionRouter.route("/:postId/pin").patch(verifyJWT, pinPost);
discussionRouter.route("/:postId").delete(verifyJWT, deletePost);

// ── REVIEWS ──────────────────────────────────────────────────
export const reviewRouter = Router();
reviewRouter.route("/").post(verifyJWT, createReview);
reviewRouter.route("/:courseId").get(getCourseReviews);
reviewRouter.route("/:courseId").delete(verifyJWT, deleteReview);

// ── NOTIFICATIONS ────────────────────────────────────────────
export const notificationRouter = Router();
notificationRouter.route("/").get(verifyJWT, getMyNotifications);
notificationRouter.route("/read-all").patch(verifyJWT, markAllAsRead);
notificationRouter.route("/:notificationId/read").patch(verifyJWT, markAsRead);
notificationRouter.route("/:notificationId").delete(verifyJWT, deleteNotification);

// ── ADMIN ────────────────────────────────────────────────────
export const adminRouter = Router();
adminRouter.use(verifyJWT, isAdmin); // all admin routes require JWT + admin role
adminRouter.route("/stats").get(getPlatformStats);
adminRouter.route("/users").get(getAllUsers);
adminRouter.route("/users/:userId/role").patch(changeUserRole);
adminRouter.route("/courses").get(getAllCoursesAdmin);
adminRouter.route("/courses/pending").get(getPendingCourses);
adminRouter.route("/courses/:courseId/approve").patch(approveCourse);
adminRouter.route("/courses/:courseId/unpublish").patch(unpublishCourse);
adminRouter.route("/ai/flagged-chats").get(getFlaggedChats);
adminRouter.route("/ai/usage").get(getAIUsageStats);