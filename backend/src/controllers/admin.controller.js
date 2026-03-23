import asyncHandler from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { User } from '../models/user.model.js';
import { Course } from '../models/course.model.js';
import { Enrollment } from '../models/enrollment.model.js';
import { Review } from '../models/review.model.js';
import { AITutorChat } from '../models/aiTutorChat.model.js';
import { Notification } from '../models/notification.model.js';

// ─── PLATFORM STATS ─────────────────────────────────────────
// GET /api/v1/admin/stats
const getPlatformStats = asyncHandler(async (req, res) => {
    const [
        totalUsers,
        totalStudents,
        totalInstructors,
        totalCourses,
        publishedCourses,
        pendingApproval,
        totalEnrollments,
        flaggedChats,
        flaggedReviews,
    ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: "student" }),
        User.countDocuments({ role: "instructor" }),
        Course.countDocuments(),
        Course.countDocuments({ status: "published", isApproved: true }),
        Course.countDocuments({ isApproved: false }),
        Enrollment.countDocuments(),
        AITutorChat.countDocuments({ isFlagged: true }),
        Review.countDocuments({ isFlagged: true }),
    ]);

    // new users in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newUsers = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

    // enrollments per day (last 7 days)
    const enrollmentTrend = await Enrollment.aggregate([
        { $match: { enrolledAt: { $gte: sevenDaysAgo } } },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$enrolledAt" } },
                count: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    return res.status(200).json(
        new ApiResponse(200, {
            totalUsers, totalStudents, totalInstructors,
            totalCourses, publishedCourses, pendingApproval,
            totalEnrollments, newUsers,
            flaggedChats, flaggedReviews,
            enrollmentTrend,
        }, "Platform stats fetched")
    );
});

// ─── GET ALL USERS ──────────────────────────────────────────
// GET /api/v1/admin/users?role=student&page=1
const getAllUsers = asyncHandler(async (req, res) => {
    const { role, search, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (role) filter.role = role;
    if (search) filter.$or = [
        { fullname: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
    ];

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
        User.find(filter)
            .select("-password -refreshToken")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit)),
        User.countDocuments(filter),
    ]);

    return res.status(200).json(
        new ApiResponse(200, { users, total, page: parseInt(page) }, "Users fetched")
    );
});

// ─── CHANGE USER ROLE ───────────────────────────────────────
// PATCH /api/v1/admin/users/:userId/role
const changeUserRole = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { role } = req.body;

    if (!["student", "instructor", "admin"].includes(role)) {
        throw new ApiError(400, "Invalid role");
    }

    if (userId === req.user._id.toString()) {
        throw new ApiError(400, "Cannot change your own role");
    }

    const user = await User.findByIdAndUpdate(
        userId,
        { role },
        { new: true }
    ).select("-password -refreshToken");

    if (!user) throw new ApiError(404, "User not found");

    return res.status(200).json(
        new ApiResponse(200, user, `User role updated to ${role}`)
    );
});

// ─── GET COURSES PENDING APPROVAL ───────────────────────────
// GET /api/v1/admin/courses/pending
const getPendingCourses = asyncHandler(async (req, res) => {
    const courses = await Course.find({ isApproved: false })
        .populate("instructor", "fullname email avatar")
        .sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, courses, "Pending courses fetched")
    );
});

// ─── APPROVE OR REJECT COURSE ───────────────────────────────
// PATCH /api/v1/admin/courses/:courseId/approve
const approveCourse = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const { approve, reason } = req.body;

    const course = await Course.findById(courseId).populate("instructor", "_id");
    if (!course) throw new ApiError(404, "Course not found");

    if (approve === true || approve === "true") {
        course.isApproved = true;
        course.status = "published";
        await course.save();

        // notify instructor
        await Notification.create({
            recipient: course.instructor._id,
            type: "course_approved",
            message: `Your course "${course.title}" has been approved and is now live!`,
            link: `/courses/${course._id}`,
            relatedCourse: course._id,
        });
    } else {
        course.isApproved = false;
        course.status = "draft";
        await course.save();

        await Notification.create({
            recipient: course.instructor._id,
            type: "course_rejected",
            message: `Your course "${course.title}" was not approved. Reason: ${reason || "Please review content guidelines."}`,
            relatedCourse: course._id,
        });
    }

    return res.status(200).json(
        new ApiResponse(200, course, approve ? "Course approved" : "Course rejected")
    );
});

// ─── FORCE UNPUBLISH COURSE ─────────────────────────────────
// PATCH /api/v1/admin/courses/:courseId/unpublish
const unpublishCourse = asyncHandler(async (req, res) => {
    const { courseId } = req.params;

    const course = await Course.findByIdAndUpdate(
        courseId,
        { status: "archived", isApproved: false },
        { new: true }
    );

    if (!course) throw new ApiError(404, "Course not found");

    return res.status(200).json(
        new ApiResponse(200, course, "Course unpublished")
    );
});

// ─── GET FLAGGED AI CHATS ───────────────────────────────────
// GET /api/v1/admin/ai/flagged-chats
const getFlaggedChats = asyncHandler(async (req, res) => {
    const chats = await AITutorChat.find({ isFlagged: true })
        .populate("student", "fullname email")
        .populate("course", "title")
        .sort({ updatedAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, chats, "Flagged chats fetched")
    );
});

// ─── GET AI USAGE STATS ─────────────────────────────────────
// GET /api/v1/admin/ai/usage
const getAIUsageStats = asyncHandler(async (req, res) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [totalSessions, totalMessages, flaggedCount, dailyUsage] = await Promise.all([
        AITutorChat.countDocuments(),
        AITutorChat.aggregate([
            { $project: { messageCount: { $size: "$messages" } } },
            { $group: { _id: null, total: { $sum: "$messageCount" } } },
        ]),
        AITutorChat.countDocuments({ isFlagged: true }),
        AITutorChat.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    sessions: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]),
    ]);

    return res.status(200).json(
        new ApiResponse(200, {
            totalSessions,
            totalMessages: totalMessages[0]?.total || 0,
            flaggedCount,
            dailyUsage,
        }, "AI usage stats fetched")
    );
});

// ─── GET ALL COURSES (admin view) ───────────────────────────
// GET /api/v1/admin/courses
const getAllCoursesAdmin = asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [courses, total] = await Promise.all([
        Course.find(filter)
            .populate("instructor", "fullname email")
            .select("-__v")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit)),
        Course.countDocuments(filter),
    ]);

    return res.status(200).json(
        new ApiResponse(200, { courses, total }, "All courses fetched")
    );
});

export {
    getPlatformStats,
    getAllUsers,
    changeUserRole,
    getPendingCourses,
    approveCourse,
    unpublishCourse,
    getFlaggedChats,
    getAIUsageStats,
    getAllCoursesAdmin,
};