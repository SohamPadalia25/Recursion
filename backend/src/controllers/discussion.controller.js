import asyncHandler from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Discussion } from '../models/discussion.model.js';
import { Enrollment } from '../models/enrollment.model.js';

// ─── CREATE POST / REPLY ────────────────────────────────────
// POST /api/v1/discussions
const createPost = asyncHandler(async (req, res) => {
    const { courseId, lessonId, content, parentPost } = req.body;

    if (!courseId || !content?.trim()) {
        throw new ApiError(400, "courseId and content are required");
    }

    // only enrolled students or instructor can post
    const enrollment = await Enrollment.findOne({
        student: req.user._id,
        course: courseId,
    });

    const { Course } = await import('../models/course.model.js');
    const course = await Course.findById(courseId).select("instructor");
    const isInstructor = course?.instructor.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!enrollment && !isInstructor && !isAdmin) {
        throw new ApiError(403, "Enroll in the course to participate in discussions");
    }

    const post = await Discussion.create({
        course: courseId,
        lesson: lessonId || null,
        author: req.user._id,
        content: content.trim(),
        parentPost: parentPost || null,
    });

    const populated = await Discussion.findById(post._id)
        .populate("author", "fullname avatar role");

    return res.status(201).json(
        new ApiResponse(201, populated, "Post created")
    );
});

// ─── GET DISCUSSIONS FOR A COURSE/LESSON ────────────────────
// GET /api/v1/discussions/:courseId?lessonId=xxx
const getDiscussions = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const { lessonId, page = 1, limit = 20 } = req.query;

    const filter = {
        course: courseId,
        parentPost: null,       // top-level only
        isDeleted: false,
    };

    if (lessonId) filter.lesson = lessonId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [posts, total] = await Promise.all([
        Discussion.find(filter)
            .populate("author", "fullname avatar role")
            .sort({ isPinned: -1, createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit)),
        Discussion.countDocuments(filter),
    ]);

    // attach reply count to each post
    const postsWithMeta = await Promise.all(
        posts.map(async (p) => {
            const replyCount = await Discussion.countDocuments({
                parentPost: p._id,
                isDeleted: false,
            });
            return { ...p.toObject(), replyCount, isUpvoted: p.upvotes.includes(req.user._id) };
        })
    );

    return res.status(200).json(
        new ApiResponse(200, { posts: postsWithMeta, total, page: parseInt(page) }, "Discussions fetched")
    );
});

// ─── GET REPLIES TO A POST ──────────────────────────────────
// GET /api/v1/discussions/replies/:postId
const getReplies = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const replies = await Discussion.find({
        parentPost: postId,
        isDeleted: false,
    })
        .populate("author", "fullname avatar role")
        .sort({ createdAt: 1 });

    return res.status(200).json(
        new ApiResponse(200, replies, "Replies fetched")
    );
});

// ─── UPVOTE / UN-UPVOTE POST ────────────────────────────────
// PATCH /api/v1/discussions/:postId/upvote
const toggleUpvote = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const post = await Discussion.findById(postId);
    if (!post || post.isDeleted) throw new ApiError(404, "Post not found");

    const alreadyUpvoted = post.upvotes.includes(req.user._id);

    if (alreadyUpvoted) {
        post.upvotes.pull(req.user._id);
    } else {
        post.upvotes.push(req.user._id);
    }

    await post.save();

    return res.status(200).json(
        new ApiResponse(200, {
            upvotes: post.upvotes.length,
            isUpvoted: !alreadyUpvoted,
        }, alreadyUpvoted ? "Upvote removed" : "Post upvoted")
    );
});

// ─── PIN POST (instructor only) ─────────────────────────────
// PATCH /api/v1/discussions/:postId/pin
const pinPost = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const post = await Discussion.findById(postId).populate("course");
    if (!post) throw new ApiError(404, "Post not found");

    if (post.course.instructor.toString() !== req.user._id.toString() && req.user.role !== "admin") {
        throw new ApiError(403, "Only the instructor can pin posts");
    }

    post.isPinned = !post.isPinned;
    await post.save();

    return res.status(200).json(
        new ApiResponse(200, { isPinned: post.isPinned }, post.isPinned ? "Post pinned" : "Post unpinned")
    );
});

// ─── DELETE POST (author, instructor, admin) ────────────────
// DELETE /api/v1/discussions/:postId
const deletePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const post = await Discussion.findById(postId).populate("course");
    if (!post) throw new ApiError(404, "Post not found");

    const isAuthor = post.author.toString() === req.user._id.toString();
    const isInstructor = post.course.instructor.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isAuthor && !isInstructor && !isAdmin) {
        throw new ApiError(403, "Not authorized to delete this post");
    }

    // soft delete
    post.isDeleted = true;
    post.content = "[deleted]";
    await post.save();

    return res.status(200).json(
        new ApiResponse(200, {}, "Post deleted")
    );
});

export { createPost, getDiscussions, getReplies, toggleUpvote, pinPost, deletePost };