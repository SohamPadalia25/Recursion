import asyncHandler from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Progress } from '../models/progress.model.js';
import { Lesson } from '../models/lesson.model.js';
import { Enrollment } from '../models/enrollment.model.js';

const COMPLETION_THRESHOLD = 0.9;

const getRequiredWatchSeconds = (lessonDuration = 0) => {
    // Lessons may be created before duration metadata is known; require at least 1s watch.
    if (!lessonDuration || lessonDuration <= 0) return 1;
    return Math.ceil(lessonDuration * COMPLETION_THRESHOLD);
};

const assertEnrollment = async (studentId, courseId) => {
    const enrollment = await Enrollment.findOne({ student: studentId, course: courseId }).select("_id");
    if (!enrollment) {
        throw new ApiError(403, "You must be enrolled in this course to track progress");
    }
};

// ─── MARK LESSON COMPLETE ───────────────────────────────────
// POST /api/v1/progress/lesson/:lessonId/complete
const markLessonComplete = asyncHandler(async (req, res) => {
    const { lessonId } = req.params;
    const { courseId, watchedDuration, attentionScore, lessonDurationSeconds } = req.body;

    if (!courseId) throw new ApiError(400, "courseId is required");

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) throw new ApiError(404, "Lesson not found");

    if (lesson.course.toString() !== String(courseId)) {
        throw new ApiError(400, "lessonId does not belong to the supplied courseId");
    }

    await assertEnrollment(req.user._id, courseId);

    const reportedDuration = Number(lessonDurationSeconds);
    const safeReportedDuration = Number.isFinite(reportedDuration) && reportedDuration > 0
        ? Math.min(Math.round(reportedDuration), 60 * 60 * 8)
        : 0;

    const effectiveLessonDuration = Math.max(Number(lesson.duration || 0), safeReportedDuration);

    if (effectiveLessonDuration > Number(lesson.duration || 0)) {
        await Lesson.findByIdAndUpdate(lesson._id, { duration: effectiveLessonDuration });
    }

    const requiredWatchSeconds = getRequiredWatchSeconds(effectiveLessonDuration);
    const normalizedWatch = Math.max(0, Number(watchedDuration ?? 0));
    const clampedWatch = effectiveLessonDuration > 0
        ? Math.min(normalizedWatch, effectiveLessonDuration)
        : normalizedWatch;

    if (clampedWatch < requiredWatchSeconds) {
        throw new ApiError(
            400,
            `Cannot complete lesson yet. Watch at least ${requiredWatchSeconds} seconds first`
        );
    }

    // upsert progress record
    const progress = await Progress.findOneAndUpdate(
        { student: req.user._id, lesson: lessonId },
        {
            student: req.user._id,
            course: courseId,
            lesson: lessonId,
            isCompleted: true,
            completedAt: new Date(),
            watchedDuration: effectiveLessonDuration > 0
                ? Math.min(clampedWatch, effectiveLessonDuration)
                : clampedWatch,
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
    const { courseId, watchedDuration, lessonDurationSeconds } = req.body;

    if (!courseId || watchedDuration === undefined) {
        throw new ApiError(400, "courseId and watchedDuration are required");
    }

    const lesson = await Lesson.findById(lessonId).select("_id duration course");
    if (!lesson) throw new ApiError(404, "Lesson not found");

    if (lesson.course.toString() !== String(courseId)) {
        throw new ApiError(400, "lessonId does not belong to the supplied courseId");
    }

    await assertEnrollment(req.user._id, courseId);

    const reportedDuration = Number(lessonDurationSeconds);
    const safeReportedDuration = Number.isFinite(reportedDuration) && reportedDuration > 0
        ? Math.min(Math.round(reportedDuration), 60 * 60 * 8)
        : 0;

    const effectiveLessonDuration = Math.max(Number(lesson.duration || 0), safeReportedDuration);

    if (effectiveLessonDuration > Number(lesson.duration || 0)) {
        await Lesson.findByIdAndUpdate(lesson._id, { duration: effectiveLessonDuration });
    }

    const normalizedWatch = Math.max(0, Number(watchedDuration));
    const clampedWatch = effectiveLessonDuration > 0
        ? Math.min(normalizedWatch, effectiveLessonDuration)
        : normalizedWatch;

    const now = new Date();
    const existing = await Progress.findOne({ student: req.user._id, lesson: lessonId });
    const previousWatch = Number(existing?.watchedDuration || 0);
    let effectiveWatch = Math.max(previousWatch, clampedWatch);

    let serverCappedIncrement = false;
    if (existing?.lastWatchedAt) {
        const elapsedSeconds = Math.max(
            0,
            (now.getTime() - new Date(existing.lastWatchedAt).getTime()) / 1000
        );

        // Protect against skip-to-end and forged payload jumps.
        const maxAllowedIncrement = Math.max(2, Math.ceil(elapsedSeconds * 1.35) + 1);
        const requestedIncrement = effectiveWatch - previousWatch;

        if (requestedIncrement > maxAllowedIncrement) {
            effectiveWatch = previousWatch + maxAllowedIncrement;
            serverCappedIncrement = true;
        }
    }

    if (effectiveLessonDuration > 0) {
        effectiveWatch = Math.min(effectiveWatch, effectiveLessonDuration);
    }

    const requiredWatchSeconds = getRequiredWatchSeconds(effectiveLessonDuration);
    const shouldComplete = effectiveWatch >= requiredWatchSeconds;

    const becameCompleted = !existing?.isCompleted && shouldComplete;

    const progress = await Progress.findOneAndUpdate(
        { student: req.user._id, lesson: lessonId },
        {
            $set: {
                watchedDuration: effectiveWatch,
                lastWatchedAt: now,
                course: courseId,
                isCompleted: existing?.isCompleted || shouldComplete,
                completedAt: existing?.isCompleted
                    ? existing.completedAt
                    : shouldComplete
                        ? new Date()
                        : null,
            },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (becameCompleted) {
        await recalculateCompletion(req.user._id, courseId);
    }

    return res.status(200).json(
        new ApiResponse(200, {
            progress,
            requiredWatchSeconds,
            completionThreshold: COMPLETION_THRESHOLD,
            serverCappedIncrement,
            effectiveLessonDurationSeconds: effectiveLessonDuration,
        }, "Watch time updated")
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

    const progressByLessonId = new Map(
        progressRecords.map((record) => [record.lesson._id.toString(), record])
    );

    const lessonsWithStatus = allLessons.map(l => ({
        ...l.toObject(),
        isCompleted: completedIds.has(l._id.toString()),
        progress: progressByLessonId.get(l._id.toString()) || null,
    }));

    const watchedSeconds = lessonsWithStatus.reduce((sum, lesson) => {
        const lessonDuration = Number(lesson.duration || 0);
        const watched = Number(lesson.progress?.watchedDuration || 0);

        if (lessonDuration > 0) {
            return sum + Math.min(watched, lessonDuration);
        }

        return sum + watched;
    }, 0);

    const totalLessonDurationSeconds = lessonsWithStatus.reduce((sum, lesson) => {
        const lessonDuration = Number(lesson.duration || 0);
        const watched = Number(lesson.progress?.watchedDuration || 0);
        // When stored duration is 0, use watched time as provisional duration baseline.
        const effectiveDuration = lessonDuration > 0 ? lessonDuration : watched;
        return sum + effectiveDuration;
    }, 0);
    const watchProgressPercentage = totalLessonDurationSeconds > 0
        ? Math.min(100, Math.round((watchedSeconds / totalLessonDurationSeconds) * 100))
        : 0;

    return res.status(200).json(
        new ApiResponse(200, {
            completionPercentage: enrollment?.completionPercentage || 0,
            isCompleted: enrollment?.isCompleted || false,
            completedLessons: completedIds.size,
            totalLessons: allLessons.length,
            watchedSeconds,
            totalLessonDurationSeconds,
            watchProgressPercentage,
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

    const lesson = await Lesson.findById(lessonId).select("_id course");
    if (!lesson) throw new ApiError(404, "Lesson not found");

    if (lesson.course.toString() !== String(courseId)) {
        throw new ApiError(400, "lessonId does not belong to the supplied courseId");
    }

    await assertEnrollment(req.user._id, courseId);

    const normalizedScore = Math.max(0, Math.min(100, Number(attentionScore)));

    await Progress.findOneAndUpdate(
        { student: req.user._id, lesson: lessonId },
        { $set: { attentionScore: normalizedScore, course: courseId } },
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