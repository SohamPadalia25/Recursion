import asyncHandler from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// ─── HELPER ─────────────────────────────────────────────────
const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating tokens");
    }
};

const cookieOptions = {
    httpOnly: true,
    secure: true,
};

// ─── REGISTER ────────────────────────────────────────────────
// POST /api/v1/users/register
const registerUser = asyncHandler(async (req, res) => {
    const { fullname, username, email, password, role } = req.body;

    if ([fullname, username, email, password].some(f => !f?.trim())) {
        throw new ApiError(400, "All fields are required");
    }

    if (!email.includes("@")) {
        throw new ApiError(400, "Email is not valid");
    }

    const existedUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existedUser) {
        throw new ApiError(409, "Username or email already exists");
    }

    // handle avatar upload
    let avatarUrl = "";
    if (req.files?.avatar?.[0]?.path) {
        const uploaded = await uploadOnCloudinary(req.files.avatar[0].path);
        if (uploaded) avatarUrl = uploaded.url;
    }

    // handle cover image upload
    let coverImageUrl = "";
    if (req.files?.coverImage?.[0]?.path) {
        const uploaded = await uploadOnCloudinary(req.files.coverImage[0].path);
        if (uploaded) coverImageUrl = uploaded.url;
    }

    const user = await User.create({
        fullname,
        username: username.toLowerCase(),
        email,
        password,
        avatar: avatarUrl,
        coverImage: coverImageUrl,
        role: role || "student",
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    );
});

// ─── LOGIN ───────────────────────────────────────────────────
// POST /api/v1/users/login
const loginUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    if (!(username || email)) {
        throw new ApiError(400, "Username or email is required");
    }

    const user = await User.findOne({ $or: [{ username }, { email }] });
    if (!user) throw new ApiError(404, "User does not exist");

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) throw new ApiError(401, "Invalid credentials");

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged in successfully")
        );
});

// ─── LOGOUT ──────────────────────────────────────────────────
// POST /api/v1/users/logout
const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        { $unset: { refreshToken: 1 } },
        { new: true }
    );

    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
});

// ─── REFRESH ACCESS TOKEN ────────────────────────────────────
// POST /api/v1/users/refresh-token
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized request");

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decodedToken?._id).select("-password");
        if (!user) throw new ApiError(401, "Invalid refresh token");

        if (user.refreshToken !== incomingRefreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }

        const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshToken(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, cookieOptions)
            .cookie("refreshToken", newRefreshToken, cookieOptions)
            .json(
                new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, "Access token refreshed")
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});

// ─── CHANGE PASSWORD ─────────────────────────────────────────
// POST /api/v1/users/change-password
const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "Old password and new password are required");
    }

    if (oldPassword === newPassword) {
        throw new ApiError(400, "New password must be different from old password");
    }

    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) throw new ApiError(400, "Invalid old password");

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(
        new ApiResponse(200, {}, "Password changed successfully")
    );
});

// ─── GET CURRENT USER ─────────────────────────────────────────
// GET /api/v1/users/current-user
const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(
        new ApiResponse(200, req.user, "Current user fetched successfully")
    );
});

// ─── UPDATE ACCOUNT DETAILS ──────────────────────────────────
// PATCH /api/v1/users/update-account
const updateUserAccountDetails = asyncHandler(async (req, res) => {
    const { fullname, email, bio } = req.body;

    if (!fullname && !email && !bio) {
        throw new ApiError(400, "Provide at least one field to update");
    }

    const updateFields = {};
    if (fullname) updateFields.fullname = fullname;
    if (email) {
        if (!email.includes("@")) throw new ApiError(400, "Email is not valid");
        // check email not taken by another user
        const emailExists = await User.findOne({ email, _id: { $ne: req.user._id } });
        if (emailExists) throw new ApiError(409, "Email already in use");
        updateFields.email = email;
    }
    if (bio !== undefined) updateFields.bio = bio;

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updateFields },
        { new: true }
    ).select("-password -refreshToken");

    return res.status(200).json(
        new ApiResponse(200, user, "Account details updated successfully")
    );
});

// ─── UPDATE AVATAR ───────────────────────────────────────────
// PATCH /api/v1/users/avatar
const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;
    if (!avatarLocalPath) throw new ApiError(400, "Avatar file is required");

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar?.url) throw new ApiError(400, "Error while uploading avatar");

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { avatar: avatar.url } },
        { new: true }
    ).select("-password -refreshToken");

    return res.status(200).json(
        new ApiResponse(200, user, "Avatar updated successfully")
    );
});

// ─── UPDATE COVER IMAGE ──────────────────────────────────────
// PATCH /api/v1/users/cover-image
const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;
    if (!coverImageLocalPath) throw new ApiError(400, "Cover image file is required");

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!coverImage?.url) throw new ApiError(400, "Error while uploading cover image");

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { coverImage: coverImage.url } },
        { new: true }
    ).select("-password -refreshToken");

    return res.status(200).json(
        new ApiResponse(200, user, "Cover image updated successfully")
    );
});

// ─── GET USER PROFILE (public) ───────────────────────────────
// GET /api/v1/users/profile/:username
const getUserProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    const user = await User.findOne({ username: username.toLowerCase() })
        .select("-password -refreshToken -email");

    if (!user) throw new ApiError(404, "User not found");

    // if instructor — attach their courses
    let courses = [];
    if (user.role === "instructor") {
        const { Course } = await import('../models/course.model.js');
        courses = await Course.find({
            instructor: user._id,
            status: "published",
            isApproved: true,
        }).select("title thumbnail category averageRating enrollmentCount");
    }

    return res.status(200).json(
        new ApiResponse(200, { user, courses }, "User profile fetched")
    );
});

// ─── GET USER'S ENROLLED COURSES SUMMARY ─────────────────────
// GET /api/v1/users/my-learning
const getMyLearning = asyncHandler(async (req, res) => {
    const { Enrollment } = await import('../models/enrollment.model.js');

    const enrollments = await Enrollment.find({ student: req.user._id })
        .populate({
            path: "course",
            select: "title thumbnail category instructor level totalDuration",
            populate: { path: "instructor", select: "fullname avatar" },
        })
        .sort({ enrolledAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, enrollments, "My learning fetched")
    );
});

// ─── GET MY BADGES ───────────────────────────────────────────
// GET /api/v1/users/my-badges
const getMyBadges = asyncHandler(async (req, res) => {
    const { Badge } = await import('../models/badge.model.js');

    const badges = await Badge.find({ student: req.user._id })
        .populate("course", "title thumbnail")
        .sort({ awardedAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, badges, "Badges fetched")
    );
});

// ─── ADMIN: GET USER BY ID ───────────────────────────────────
// GET /api/v1/users/:userId  (admin only — handled via admin routes)
const getUserById = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    const user = await User.findById(userId).select("-password -refreshToken");
    if (!user) throw new ApiError(404, "User not found");

    return res.status(200).json(
        new ApiResponse(200, user, "User fetched")
    );
});

// ─── GET USER DIRECTORY FOR LIVE TOOLS ─────────────────────
// GET /api/v1/users/directory?role=instructor&search=alex&limit=25
const getUserDirectory = asyncHandler(async (req, res) => {
    const { role, search, limit = 25 } = req.query;

    const parsedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 25, 100));
    const filter = { _id: { $ne: req.user._id } };

    if (role && ["student", "instructor", "admin"].includes(role)) {
        filter.role = role;
    }

    if (search?.trim()) {
        filter.$or = [
            { fullname: { $regex: search.trim(), $options: "i" } },
            { username: { $regex: search.trim(), $options: "i" } },
            { email: { $regex: search.trim(), $options: "i" } },
        ];
    }

    const users = await User.find(filter)
        .select("_id fullname username email role avatar")
        .sort({ fullname: 1 })
        .limit(parsedLimit)
        .lean();

    return res.status(200).json(
        new ApiResponse(200, users, "User directory fetched")
    );
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateUserAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserProfile,
    getMyLearning,
    getMyBadges,
    getUserById,
    getUserDirectory,
};