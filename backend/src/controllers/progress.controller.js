import asyncHandler from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Progress } from '../models/progress.model.js';
import { Lesson } from '../models/lesson.model.js';
import { Enrollment } from '../models/enrollment.model.js';

// ─── MARK LESSON COMPLETE ───────────────────────────────────
// POST /api/v1/progress/lesson/:lessonId/complete
const markLessonComplete = asyncHandler(async (req, res) => {
    const { lessonId } = req.params;
    const { courseId, watchedDuration, attentionScore } = req.body;

    if (!courseId) throw new ApiError(400, "courseId is required");

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) throw new ApiError(404, "Lesson not found");

    // upsert progress record
    const progress = await Progress.findOneAndUpdate(
        { student: req.user._id, lesson: lessonId },
        {
            student: req.user._id,
            course: courseId,
            lesson: lessonId,
            isCompleted: true,
            completedAt: new Date(),
            watchedDuration: watchedDuration || lesson.duration,
            attentionScore: attentionScore || null,
            lastWatchedAt: new Date(),
        },
        { upsert: true, new: true }
    );

    // recalculate course completion percentage
    await recalculateCompletion(req.user._id, courseId);

    return res.status(200).json(
        new ApiResponse(200, progress, "Lesson marked as complete")
    );
});

// ─── UPDATE WATCH TIME (called every 30 seconds) ────────────
// PATCH /api/v1/progress/lesson/:lessonId/watch
const updateWatchTime = asyncHandler(async (req, res) => {
    const { lessonId } = req.params;
    const { courseId, watchedDuration } = req.body;

    if (!courseId || watchedDuration === undefined) {
        throw new ApiError(400, "courseId and watchedDuration are required");
    }

    await Progress.findOneAndUpdate(
        { student: req.user._id, lesson: lessonId },
        {
            $set: {
                watchedDuration,
                lastWatchedAt: new Date(),
                course: courseId,
            },
        },
        { upsert: true }
    );

    return res.status(200).json(
        new ApiResponse(200, {}, "Watch time updated")
    );
});

// ─── GET COURSE PROGRESS (student) ─────────────────────────
// GET /api/v1/progress/course/:courseId
const getCourseProgress = asyncHandler(async (req, res) => {
    const { courseId } = req.params;

    const [progressRecords, allLessons, enrollment] = await Promise.all([
        Progress.find({ student: req.user._id, course: courseId })
            .populate("lesson", "title duration order module"),
        Lesson.find({ course: courseId })
            .select("_id title duration order module")
            .sort({ order: 1 }),
        Enrollment.findOne({ student: req.user._id, course: courseId })
            .select("completionPercentage isCompleted enrolledAt deadline"),
    ]);

    const completedIds = new Set(
        progressRecords.filter(p => p.isCompleted).map(p => p.lesson._id.toString())
    );

    const lessonsWithStatus = allLessons.map(l => ({
        ...l.toObject(),
        isCompleted: completedIds.has(l._id.toString()),
        progress: progressRecords.find(p => p.lesson._id.toString() === l._id.toString()) || null,
    }));

    return res.status(200).json(
        new ApiResponse(200, {
            completionPercentage: enrollment?.completionPercentage || 0,
            isCompleted: enrollment?.isCompleted || false,
            completedLessons: completedIds.size,
            totalLessons: allLessons.length,
            lessons: lessonsWithStatus,
            enrollment,
        }, "Progress fetched")
    );
});

// ─── GET ALL PROGRESS FOR INSTRUCTOR VIEW ───────────────────
// GET /api/v1/progress/student/:studentId/course/:courseId
const getStudentProgress = asyncHandler(async (req, res) => {
    const { studentId, courseId } = req.params;

    const progress = await Progress.find({ student: studentId, course: courseId })
        .populate("lesson", "title duration order");

    return res.status(200).json(
        new ApiResponse(200, progress, "Student progress fetched")
    );
});

// ─── SAVE ATTENTION SCORE (from CV agent) ───────────────────
// PATCH /api/v1/progress/lesson/:lessonId/attention
const saveAttentionScore = asyncHandler(async (req, res) => {
    const { lessonId } = req.params;
    const { courseId, attentionScore } = req.body;

    if (attentionScore === undefined) throw new ApiError(400, "attentionScore required");

    await Progress.findOneAndUpdate(
        { student: req.user._id, lesson: lessonId },
        { $set: { attentionScore, course: courseId } },
        { upsert: true }
    );

    return res.status(200).json(
        new ApiResponse(200, {}, "Attention score saved")
    );
});

// ─── Helper: recalculate % and update enrollment ─────────────
const recalculateCompletion = async (studentId, courseId) => {
    const [totalLessons, completedLessons] = await Promise.all([
        Lesson.countDocuments({ course: courseId }),
        Progress.countDocuments({ student: studentId, course: courseId, isCompleted: true }),
    ]);

    if (totalLessons === 0) return;

    const percentage = Math.round((completedLessons / totalLessons) * 100);

    await Enrollment.findOneAndUpdate(
        { student: studentId, course: courseId },
        {
            completionPercentage: percentage,
            isCompleted: percentage === 100,
            completedAt: percentage === 100 ? new Date() : null,
        }
    );
};

export {
    markLessonComplete,
    updateWatchTime,
    getCourseProgress,
    getStudentProgress,
    saveAttentionScore,
};