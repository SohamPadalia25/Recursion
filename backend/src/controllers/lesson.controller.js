import asyncHandler from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Lesson } from '../models/lesson.model.js';
import { Module } from '../models/module.model.js';
import { Course } from '../models/course.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';

// ─── CREATE LESSON ──────────────────────────────────────────
// POST /api/v1/lessons
const createLesson = asyncHandler(async (req, res) => {
    const { moduleId, courseId, title, description, isFree, videoUrl } = req.body;

    if (!moduleId || !courseId || !title) {
        throw new ApiError(400, "moduleId, courseId and title are required");
    }

    const [module, course] = await Promise.all([
        Module.findById(moduleId),
        Course.findById(courseId),
    ]);

    if (!module) throw new ApiError(404, "Module not found");
    if (!course) throw new ApiError(404, "Course not found");

    if (course.instructor.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Only the instructor can add lessons");
    }

    // handle video upload or YouTube URL
    let finalVideoUrl = videoUrl || "";
    let duration = 0;

    if (req.file) {
        const uploaded = await uploadOnCloudinary(req.file.path);
        if (!uploaded) throw new ApiError(500, "Video upload failed");
        finalVideoUrl = uploaded.url;
        duration = uploaded.duration || 0;
    }

    if (!finalVideoUrl) throw new ApiError(400, "Video file or videoUrl is required");

    // auto-assign order
    const lastLesson = await Lesson.findOne({ module: moduleId }).sort({ order: -1 });
    const order = lastLesson ? lastLesson.order + 1 : 1;

    const lesson = await Lesson.create({
        title,
        description,
        module: moduleId,
        course: courseId,
        videoUrl: finalVideoUrl,
        duration,
        order,
        isFree: isFree === "true" || isFree === true,
    });

    return res.status(201).json(
        new ApiResponse(201, lesson, "Lesson created successfully")
    );
});

// ─── GET LESSON (student must be enrolled) ──────────────────
// GET /api/v1/lessons/:lessonId
const getLesson = asyncHandler(async (req, res) => {
    const { lessonId } = req.params;

    const lesson = await Lesson.findById(lessonId)
        .populate("module", "title")
        .populate("course", "title instructor");

    if (!lesson) throw new ApiError(404, "Lesson not found");

    // free lesson — anyone can view
    if (lesson.isFree) {
        return res.status(200).json(new ApiResponse(200, lesson, "Lesson fetched"));
    }

    // paid lesson — check enrollment
    const { Enrollment } = await import('../models/enrollment.model.js');
    const enrollment = await Enrollment.findOne({
        student: req.user._id,
        course: lesson.course._id,
    });

    const isInstructor = lesson.course.instructor.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!enrollment && !isInstructor && !isAdmin) {
        throw new ApiError(403, "Enroll in the course to access this lesson");
    }

    return res.status(200).json(new ApiResponse(200, lesson, "Lesson fetched"));
});

// ─── UPDATE LESSON ──────────────────────────────────────────
// PATCH /api/v1/lessons/:lessonId
const updateLesson = asyncHandler(async (req, res) => {
    const { lessonId } = req.params;
    const { title, description, isFree, videoUrl } = req.body;

    const lesson = await Lesson.findById(lessonId).populate("course");
    if (!lesson) throw new ApiError(404, "Lesson not found");

    if (lesson.course.instructor.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Not authorized");
    }

    if (req.file) {
        const uploaded = await uploadOnCloudinary(req.file.path);
        if (uploaded) {
            lesson.videoUrl = uploaded.url;
            lesson.duration = uploaded.duration || lesson.duration;
        }
    }

    if (title) lesson.title = title;
    if (description !== undefined) lesson.description = description;
    if (isFree !== undefined) lesson.isFree = isFree === "true" || isFree === true;
    if (videoUrl) lesson.videoUrl = videoUrl;

    await lesson.save();

    return res.status(200).json(
        new ApiResponse(200, lesson, "Lesson updated successfully")
    );
});

// ─── DELETE LESSON ──────────────────────────────────────────
// DELETE /api/v1/lessons/:lessonId
const deleteLesson = asyncHandler(async (req, res) => {
    const { lessonId } = req.params;

    const lesson = await Lesson.findById(lessonId).populate("course");
    if (!lesson) throw new ApiError(404, "Lesson not found");

    if (lesson.course.instructor.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Not authorized");
    }

    await Lesson.findByIdAndDelete(lessonId);

    return res.status(200).json(
        new ApiResponse(200, {}, "Lesson deleted")
    );
});

// ─── ADD RESOURCE TO LESSON ─────────────────────────────────
// PATCH /api/v1/lessons/:lessonId/resource
const addResource = asyncHandler(async (req, res) => {
    const { lessonId } = req.params;
    const { title, url, type } = req.body;

    if (!title || !url) throw new ApiError(400, "title and url are required");

    const lesson = await Lesson.findById(lessonId).populate("course");
    if (!lesson) throw new ApiError(404, "Lesson not found");

    if (lesson.course.instructor.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Not authorized");
    }

    lesson.resources.push({ title, url, type: type || "link" });
    await lesson.save();

    return res.status(200).json(
        new ApiResponse(200, lesson.resources, "Resource added")
    );
});

// ─── GET ALL LESSONS FOR A MODULE ───────────────────────────
// GET /api/v1/lessons/module/:moduleId
const getModuleLessons = asyncHandler(async (req, res) => {
    const { moduleId } = req.params;

    const lessons = await Lesson.find({ module: moduleId })
        .select("title duration order isFree description")
        .sort({ order: 1 });

    return res.status(200).json(
        new ApiResponse(200, lessons, "Lessons fetched")
    );
});

export { createLesson, getLesson, updateLesson, deleteLesson, addResource, getModuleLessons };