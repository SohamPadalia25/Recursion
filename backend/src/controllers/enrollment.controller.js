import asyncHandler from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Enrollment } from '../models/enrollment.model.js';
import { Course } from '../models/course.model.js';
import { Progress } from '../models/progress.model.js';
import { Lesson } from '../models/lesson.model.js';

// ─── ENROLL IN COURSE ───────────────────────────────────────
// POST /api/v1/enrollments
const enrollInCourse = asyncHandler(async (req, res) => {
    const { courseId, studyGoal, deadline } = req.body;

    if (!courseId) throw new ApiError(400, "courseId is required");

    const course = await Course.findById(courseId);
    if (!course) throw new ApiError(404, "Course not found");

    if (course.status !== "published" || !course.isApproved) {
        throw new ApiError(400, "This course is not available for enrollment");
    }

    // prevent duplicate enrollment
    const existing = await Enrollment.findOne({
        student: req.user._id,
        course: courseId,
    });

    if (existing) throw new ApiError(409, "Already enrolled in this course");

    const enrollment = await Enrollment.create({
        student: req.user._id,
        course: courseId,
        studyGoal: studyGoal || "",
        deadline: deadline ? new Date(deadline) : null,
    });

    // increment course enrollment count
    await Course.findByIdAndUpdate(courseId, {
        $inc: { enrollmentCount: 1 },
    });

    return res.status(201).json(
        new ApiResponse(201, enrollment, "Enrolled successfully")
    );
});

// ─── GET MY ENROLLMENTS (student) ──────────────────────────
// GET /api/v1/enrollments/my
const getMyEnrollments = asyncHandler(async (req, res) => {
    const enrollments = await Enrollment.find({ student: req.user._id })
        .populate("course", "title thumbnail instructor category totalDuration averageRating")
        .sort({ enrolledAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, enrollments, "Enrollments fetched")
    );
});

// ─── GET STUDENTS IN A COURSE (instructor) ──────────────────
// GET /api/v1/enrollments/course/:courseId/students
const getCourseStudents = asyncHandler(async (req, res) => {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) throw new ApiError(404, "Course not found");

    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== "admin") {
        throw new ApiError(403, "Not authorized");
    }

    const enrollments = await Enrollment.find({ course: courseId })
        .populate("student", "fullname email avatar username")
        .select("completionPercentage enrolledAt isCompleted completedAt student")
        .sort({ enrolledAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, enrollments, "Students fetched")
    );
});

// ─── CHECK ENROLLMENT STATUS ────────────────────────────────
// GET /api/v1/enrollments/status/:courseId
const checkEnrollment = asyncHandler(async (req, res) => {
    const { courseId } = req.params;

    const enrollment = await Enrollment.findOne({
        student: req.user._id,
        course: courseId,
    });

    return res.status(200).json(
        new ApiResponse(200, {
            isEnrolled: !!enrollment,
            enrollment: enrollment || null,
        }, "Enrollment status fetched")
    );
});

// ─── UNENROLL FROM COURSE ────────────────────────────────────
// DELETE /api/v1/enrollments/:courseId
const unenroll = asyncHandler(async (req, res) => {
    const { courseId } = req.params;

    const enrollment = await Enrollment.findOne({
        student: req.user._id,
        course: courseId,
    });

    if (!enrollment) throw new ApiError(404, "Enrollment not found");

    await Enrollment.findByIdAndDelete(enrollment._id);

    await Course.findByIdAndUpdate(courseId, {
        $inc: { enrollmentCount: -1 },
    });

    return res.status(200).json(
        new ApiResponse(200, {}, "Unenrolled successfully")
    );
});

export { enrollInCourse, getMyEnrollments, getCourseStudents, checkEnrollment, unenroll };