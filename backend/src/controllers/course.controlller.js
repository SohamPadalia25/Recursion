import asyncHandler from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Course } from '../models/course.model.js';
import { Module } from '../models/module.model.js';
import { Lesson } from '../models/lesson.model.js';
import { Enrollment } from '../models/enrollment.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import mongoose from 'mongoose';

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildTitleSearchRegex = (identifier = "") => {
    const tokens = String(identifier)
        .trim()
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean)
        .map((t) => escapeRegex(t));

    if (!tokens.length) return null;
    return new RegExp(tokens.join('.*'), 'i');
};

const resolveCourseByIdentifier = (courseIdentifier) => {
    if (!courseIdentifier) return null;

    if (mongoose.isValidObjectId(courseIdentifier)) {
        return Course.findById(courseIdentifier);
    }

    const titleRegex = buildTitleSearchRegex(courseIdentifier);
    if (!titleRegex) return null;

    return Course.findOne({ title: { $regex: titleRegex } });
};

// ─── CREATE COURSE ──────────────────────────────────────────
// POST /api/v1/courses
const createCourse = asyncHandler(async (req, res) => {
    const { title, description, category, price, level, language, tags } = req.body;
    const modulesInput = req.body?.modules;

    if (!title || !description || !category) {
        throw new ApiError(400, "Title, description and category are required");
    }

    let thumbnailUrl = "";
    if (req.file) {
        const uploaded = await uploadOnCloudinary(req.file.path);
        if (!uploaded) throw new ApiError(500, "Thumbnail upload failed");
        thumbnailUrl = uploaded.url;
    }

    const parsedTags = Array.isArray(tags)
        ? tags
        : typeof tags === "string"
            ? tags.split(",").map((t) => t.trim()).filter(Boolean)
            : [];

    const parseModules = (rawModules) => {
        if (!rawModules) return [];
        if (Array.isArray(rawModules)) return rawModules;
        if (typeof rawModules === "string") {
            try {
                const parsed = JSON.parse(rawModules);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                throw new ApiError(400, "Invalid modules payload");
            }
        }
        return [];
    };

    const modules = parseModules(modulesInput);

    if (!modules.length) {
        throw new ApiError(400, "Add at least one module before creating a course");
    }

    const normalizeModules = modules.map((moduleData = {}, moduleIndex) => {
        const moduleTitle = String(moduleData.title || "").trim();
        const moduleDescription = String(moduleData.description || "").trim();

        if (!moduleTitle) {
            throw new ApiError(400, `Module title is required at position ${moduleIndex + 1}`);
        }

        const lessons = Array.isArray(moduleData.lessons) ? moduleData.lessons : [];
        if (!lessons.length) {
            throw new ApiError(400, `Add at least one lesson to module ${moduleIndex + 1}`);
        }

        const normalizedLessons = lessons.map((lessonData = {}, lessonIndex) => {
            const lessonTitle = String(lessonData.title || "").trim();
            const lessonDescription = String(lessonData.description || "").trim();
            const lessonVideoUrl = String(lessonData.videoUrl || "").trim();
            const lessonDuration = Number(lessonData.duration || 0);

            if (!lessonTitle) {
                throw new ApiError(400, `Lesson title is required at module ${moduleIndex + 1}, lesson ${lessonIndex + 1}`);
            }

            if (!lessonVideoUrl) {
                throw new ApiError(400, `Lesson videoUrl is required at module ${moduleIndex + 1}, lesson ${lessonIndex + 1}`);
            }

            return {
                title: lessonTitle,
                description: lessonDescription,
                videoUrl: lessonVideoUrl,
                duration: Number.isFinite(lessonDuration) && lessonDuration > 0 ? lessonDuration : 0,
                isFree: lessonData.isFree === true || lessonData.isFree === "true",
            };
        });

        return {
            title: moduleTitle,
            description: moduleDescription,
            prerequisiteModule: moduleData.prerequisiteModule || null,
            lessons: normalizedLessons,
        };
    });

    const course = await Course.create({
        title,
        description,
        instructor: req.user._id,
        thumbnail: thumbnailUrl,
        category,
        price: price || 0,
        level: level || "beginner",
        language: language || "English",
        tags: parsedTags,
        status: "draft",
        isApproved: false,
    });

    if (normalizeModules.length > 0) {
        for (let moduleIndex = 0; moduleIndex < normalizeModules.length; moduleIndex += 1) {
            const moduleData = normalizeModules[moduleIndex];
            const createdModule = await Module.create({
                title: moduleData.title,
                description: moduleData.description || "",
                course: course._id,
                order: moduleIndex + 1,
                prerequisiteModule: moduleData.prerequisiteModule || null,
                isLocked: Boolean(moduleData.prerequisiteModule),
            });

            for (let lessonIndex = 0; lessonIndex < moduleData.lessons.length; lessonIndex += 1) {
                const lessonData = moduleData.lessons[lessonIndex];
                await Lesson.create({
                    title: lessonData.title,
                    description: lessonData.description,
                    module: createdModule._id,
                    course: course._id,
                    videoUrl: lessonData.videoUrl,
                    duration: lessonData.duration,
                    order: lessonIndex + 1,
                    isFree: lessonData.isFree,
                });
            }
        }
    }

    return res.status(201).json(
        new ApiResponse(201, course, "Course created successfully")
    );
});

// ─── GET ALL PUBLISHED COURSES (public) ────────────────────
// GET /api/v1/courses
const getAllCourses = asyncHandler(async (req, res) => {
    const { category, level, search, page = 1, limit = 12 } = req.query;

    const filter = { status: "published", isApproved: true };
    if (category) filter.category = category;
    if (level) filter.level = level;
    if (search) filter.title = { $regex: search, $options: "i" };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [courses, total] = await Promise.all([
        Course.find(filter)
            .populate("instructor", "fullname avatar")
            .select("-__v")
            .sort({ enrollmentCount: -1 })
            .skip(skip)
            .limit(parseInt(limit)),
        Course.countDocuments(filter),
    ]);

    return res.status(200).json(
        new ApiResponse(200, {
            courses,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
        }, "Courses fetched")
    );
});

// ─── GET SINGLE COURSE (public) ────────────────────────────
// GET /api/v1/courses/:courseId
const getCourse = asyncHandler(async (req, res) => {
    const { courseId } = req.params;

    const course = await resolveCourseByIdentifier(courseId)
        .populate("instructor", "fullname avatar bio");

    if (!course) throw new ApiError(404, "Course not found");

    const resolvedCourseId = course._id;

    // fetch modules + lessons (structure tree)
    const modules = await Module.find({ course: resolvedCourseId }).sort({ order: 1 });
    const lessons = await Lesson.find({ course: resolvedCourseId })
        .select("title duration order module isFree")
        .sort({ order: 1 });

    // nest lessons inside modules
    const courseTree = modules.map(mod => ({
        ...mod.toObject(),
        lessons: lessons.filter(l => l.module.toString() === mod._id.toString()),
    }));

    return res.status(200).json(
        new ApiResponse(200, { course, modules: courseTree }, "Course fetched")
    );
});

// ─── UPDATE COURSE ──────────────────────────────────────────
// PATCH /api/v1/courses/:courseId
const updateCourse = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const { title, description, category, price, level, language, tags, status } = req.body;

    const course = await Course.findById(courseId);
    if (!course) throw new ApiError(404, "Course not found");

    if (course.instructor.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not the instructor of this course");
    }

    if (req.file) {
        const uploaded = await uploadOnCloudinary(req.file.path);
        if (uploaded) course.thumbnail = uploaded.url;
    }

    if (title) course.title = title;
    if (description) course.description = description;
    if (category) course.category = category;
    if (price !== undefined) course.price = price;
    if (level) course.level = level;
    if (language) course.language = language;
    if (tags) course.tags = tags.split(",").map(t => t.trim());

    // instructor can submit for review
    if (status === "published" && !course.isApproved) {
        throw new ApiError(403, "Course must be approved by admin before publishing");
    }
    if (status) course.status = status;

    await course.save();

    return res.status(200).json(
        new ApiResponse(200, course, "Course updated successfully")
    );
});

// ─── DELETE COURSE ──────────────────────────────────────────
// DELETE /api/v1/courses/:courseId
const deleteCourse = asyncHandler(async (req, res) => {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) throw new ApiError(404, "Course not found");

    const isInstructor = course.instructor.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isInstructor && !isAdmin) {
        throw new ApiError(403, "Not authorized to delete this course");
    }

    await Course.findByIdAndDelete(courseId);
    // cascade delete modules and lessons
    await Module.deleteMany({ course: courseId });
    await Lesson.deleteMany({ course: courseId });

    return res.status(200).json(
        new ApiResponse(200, {}, "Course deleted successfully")
    );
});

// ─── GET INSTRUCTOR'S OWN COURSES ──────────────────────────
// GET /api/v1/courses/my-courses
const getMyCoursesAsInstructor = asyncHandler(async (req, res) => {
    const courses = await Course.find({ instructor: req.user._id })
        .select("-__v")
        .sort({ createdAt: -1 })
        .lean();

    const courseIds = courses.map((course) => course._id);

    const [moduleCounts, lessonCounts] = await Promise.all([
        Module.aggregate([
            { $match: { course: { $in: courseIds } } },
            { $group: { _id: "$course", count: { $sum: 1 } } },
        ]),
        Lesson.aggregate([
            { $match: { course: { $in: courseIds } } },
            { $group: { _id: "$course", count: { $sum: 1 } } },
        ]),
    ]);

    const moduleCountMap = new Map(moduleCounts.map((item) => [String(item._id), item.count]));
    const lessonCountMap = new Map(lessonCounts.map((item) => [String(item._id), item.count]));

    const coursesWithStructure = courses.map((course) => ({
        ...course,
        moduleCount: moduleCountMap.get(String(course._id)) || 0,
        lessonCount: lessonCountMap.get(String(course._id)) || 0,
    }));

    return res.status(200).json(
        new ApiResponse(200, coursesWithStructure, "Your courses fetched")
    );
});

// ─── SUBMIT FOR ADMIN APPROVAL ──────────────────────────────
// PATCH /api/v1/courses/:courseId/submit
const submitForApproval = asyncHandler(async (req, res) => {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) throw new ApiError(404, "Course not found");

    if (course.instructor.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Not authorized");
    }

    // basic validation before submission
    const lessonCount = await Lesson.countDocuments({ course: courseId });
    if (lessonCount === 0) {
        throw new ApiError(400, "Add at least one lesson before submitting");
    }

    course.status = "draft"; // stays draft until admin approves
    await course.save();

    return res.status(200).json(
        new ApiResponse(200, course, "Course submitted for approval")
    );
});

export {
    createCourse,
    getAllCourses,
    getCourse,
    updateCourse,
    deleteCourse,
    getMyCoursesAsInstructor,
    submitForApproval,
};