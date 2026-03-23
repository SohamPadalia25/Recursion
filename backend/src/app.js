import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// ── Route imports ────────────────────────────────────────────
import userRouter from "./routes/user.routes.js";
import courseRouter from "./routes/course.routes.js";
import moduleRouter from "./routes/module.routes.js";
import lessonRouter from "./routes/lesson.routes.js";
import aiRouter from "./routes/ai.routes.js";
import {
    enrollmentRouter,
    progressRouter,
    discussionRouter,
    reviewRouter,
    notificationRouter,
    adminRouter,
} from "./routes/other.routes.js";

// ── Route declarations ───────────────────────────────────────
app.use("/api/v1/users",         userRouter);
app.use("/api/v1/courses",       courseRouter);
app.use("/api/v1/modules",       moduleRouter);
app.use("/api/v1/lessons",       lessonRouter);
app.use("/api/v1/enrollments",   enrollmentRouter);
app.use("/api/v1/progress",      progressRouter);
app.use("/api/v1/discussions",   discussionRouter);
app.use("/api/v1/reviews",       reviewRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/admin",         adminRouter);
app.use("/api/v1/ai",            aiRouter);
app.use("/api/v1/user",          userRouter); // for backward compatibility

// ── Global error handler ─────────────────────────────────────
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    console.error("API error:", err?.message || err);
    if (err?.stack) console.error(err.stack);
    return res.status(statusCode).json({
        success: false,
        message: err.message || "Internal server error",
        errors: err.error || [],
    });
});

export default app;