import asyncHandler from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Review } from '../models/review.model.js';
import { Enrollment } from '../models/enrollment.model.js';
import mongoose from 'mongoose';
import { Course } from '../models/course.model.js';

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

const resolveCourseByIdentifier = async (courseIdentifier) => {
    if (!courseIdentifier) return null;

    if (mongoose.isValidObjectId(courseIdentifier)) {
        return Course.findById(courseIdentifier).select('_id');
    }

    const titleRegex = buildTitleSearchRegex(courseIdentifier);
    if (!titleRegex) return null;

    return Course.findOne({ title: { $regex: titleRegex } }).select('_id');
};

const recalculateCourseReviews = async (courseId) => {
    const stats = await Review.aggregate([
        { $match: { course: new mongoose.Types.ObjectId(courseId), isFlagged: false } },
        { $group: { _id: "$course", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);

    if (stats.length === 0) {
        await Course.findByIdAndUpdate(courseId, {
            averageRating: 0,
            totalReviews: 0,
        });
        return;
    }

    await Course.findByIdAndUpdate(courseId, {
        averageRating: Math.round(stats[0].avg * 10) / 10,
        totalReviews: stats[0].count,
    });
};

// ─── CREATE / UPDATE REVIEW ─────────────────────────────────
// POST /api/v1/reviews
const createReview = asyncHandler(async (req, res) => {
    const { courseId, rating, comment } = req.body;

    if (!courseId || !rating) throw new ApiError(400, "courseId and rating are required");
    if (rating < 1 || rating > 5) throw new ApiError(400, "Rating must be between 1 and 5");

    const course = await resolveCourseByIdentifier(courseId);
    if (!course) throw new ApiError(404, "Course not found");

    // must be enrolled to review
    const enrollment = await Enrollment.findOne({
        student: req.user._id,
        course: course._id,
    });
    if (!enrollment) throw new ApiError(403, "Enroll in the course to leave a review");

    // upsert — one review per student per course
    const review = await Review.findOneAndUpdate(
        { student: req.user._id, course: course._id },
        { rating, comment: comment || "", isFlagged: false },
        { upsert: true, new: true }
    );

    await recalculateCourseReviews(course._id);

    return res.status(201).json(
        new ApiResponse(201, review, "Review submitted")
    );
});

// ─── GET REVIEWS FOR A COURSE ───────────────────────────────
// GET /api/v1/reviews/:courseId
const getCourseReviews = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const course = await resolveCourseByIdentifier(courseId);
    if (!course) throw new ApiError(404, "Course not found");

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reviews, total] = await Promise.all([
        Review.find({ course: course._id, isFlagged: false })
            .populate("student", "fullname avatar")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit)),
        Review.countDocuments({ course: course._id, isFlagged: false }),
    ]);

    // rating breakdown  
    const breakdown = await Review.aggregate([
        { $match: { course: course._id, isFlagged: false } },
        { $group: { _id: "$rating", count: { $sum: 1 } } },
        { $sort: { _id: -1 } },
    ]);

    return res.status(200).json(
        new ApiResponse(200, { reviews, total, breakdown }, "Reviews fetched")
    );
});

// ─── DELETE MY REVIEW ───────────────────────────────────────
// DELETE /api/v1/reviews/:courseId
const deleteReview = asyncHandler(async (req, res) => {
    const { courseId } = req.params;

    const course = await resolveCourseByIdentifier(courseId);
    if (!course) throw new ApiError(404, "Course not found");

    const review = await Review.findOneAndDelete({
        student: req.user._id,
        course: course._id,
    });

    if (!review) throw new ApiError(404, "Review not found");

    await recalculateCourseReviews(course._id);

    return res.status(200).json(
        new ApiResponse(200, {}, "Review deleted")
    );
});

export { createReview, getCourseReviews, deleteReview };