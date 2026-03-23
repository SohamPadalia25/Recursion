import { Router } from "express";
import {
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
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/role.middleware.js";

const router = Router();

// ─── PUBLIC ROUTES ───────────────────────────────────────────

// POST /api/v1/users/register
router.route("/register").post(
    upload.fields([
        { name: "avatar", maxCount: 1 },
        { name: "coverImage", maxCount: 1 },
    ]),
    registerUser
);

// POST /api/v1/users/login
router.route("/login").post(loginUser);

// POST /api/v1/users/refresh-token
router.route("/refresh-token").post(refreshAccessToken);

// GET /api/v1/users/profile/:username  (public profile page)
router.route("/profile/:username").get(getUserProfile);

// ─── SECURED ROUTES (require login) ─────────────────────────

// POST /api/v1/users/logout
router.route("/logout").post(verifyJWT, logoutUser);

// POST /api/v1/users/change-password
router.route("/change-password").post(verifyJWT, changeCurrentPassword);

// GET /api/v1/users/current-user
router.route("/current-user").get(verifyJWT, getCurrentUser);

// PATCH /api/v1/users/update-account
router.route("/update-account").patch(verifyJWT, updateUserAccountDetails);

// PATCH /api/v1/users/avatar
router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar);

// PATCH /api/v1/users/cover-image
router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);

// GET /api/v1/users/my-learning
router.route("/my-learning").get(verifyJWT, getMyLearning);

// GET /api/v1/users/my-badges
router.route("/my-badges").get(verifyJWT, getMyBadges);

// GET /api/v1/users/directory
router.route("/directory").get(verifyJWT, getUserDirectory);

// ─── ADMIN ROUTES ────────────────────────────────────────────

// GET /api/v1/users/:userId  (admin: view any user's full profile)
router.route("/:userId").get(verifyJWT, isAdmin, getUserById);

export default router;