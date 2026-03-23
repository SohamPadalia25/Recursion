import asyncHandler from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Review } from '../models/review.model.js';
import { Enrollment } from '../models/enrollment.model.js';

// ─── CREATE / UPDATE REVIEW ─────────────────────────────────
// POST /api/v1/reviews
const createReview = asyncHandler(async (req, res) => {
    const { courseId, rating, comment } = req.body;

    if (!courseId || !rating) throw new ApiError(400, "courseId and rating are required");
    if (rating < 1 || rating > 5) throw new ApiError(400, "Rating must be between 1 and 5");

    // must be enrolled to review
    const enrollment = await Enrollment.findOne({
        student: req.user._id,
        course: courseId,
    });
    if (!enrollment) throw new ApiError(403, "Enroll in the course to leave a review");

    // upsert — one review per student per course
    const review = await Review.findOneAndUpdate(
        { student: req.user._id, course: courseId },
        { rating, comment: comment || "", isFlagged: false },
        { upsert: true, new: true }
    );

    return res.status(201).json(
        new ApiResponse(201, review, "Review submitted")
    );
});

// ─── GET REVIEWS FOR A COURSE ───────────────────────────────
// GET /api/v1/reviews/:courseId
const getCourseReviews = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reviews, total] = await Promise.all([
        Review.find({ course: courseId, isFlagged: false })
            .populate("student", "fullname avatar")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit)),
        Review.countDocuments({ course: courseId, isFlagged: false }),
    ]);

    // rating breakdown  
    const breakdown = await Review.aggregate([
        { $match: { course: require('mongoose').Types.ObjectId(courseId) } },
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

    const review = await Review.findOneAndDelete({
        student: req.user._id,
        course: courseId,
    });

    if (!review) throw new ApiError(404, "Review not found");

    return res.status(200).json(
        new ApiResponse(200, {}, "Review deleted")
    );
});

export { createReview, getCourseReviews, deleteReview };