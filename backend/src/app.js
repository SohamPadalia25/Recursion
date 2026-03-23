import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import { ApiError } from "./utils/ApiError.js";
import graphRoutes from "./routes/graph.routes.js";
import videoCallRoutes from "./routes/videoCall.routes.js";
import notesRoutes from "./routes/notes.routes.js";
import mailerRoutes from "./routes/mailer.routes.js";
import certificateRoutes from "./routes/certificate.routes.js";
import userRoutes from "./routes/user.routes.js";
import courseRoutes from "./routes/course.routes.js";
import moduleRoutes from "./routes/module.routes.js";
import lessonRoutes from "./routes/lesson.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import courseGenerationRoutes from "./routes/courseGeneration.routes.js";
import pipelineRoutes from "./routes/pipeline.routes.js";
import {
  enrollmentRouter,
  progressRouter,
  discussionRouter,
  reviewRouter,
  notificationRouter,
  adminRouter,
} from "./routes/other.routes.js";

const app = express();

const envOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean)
  : [];

const allowedOrigins = new Set([
  ...envOrigins,
  "http://localhost:5173",
  "http://localhost:8080",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8080",
]);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use("/pipeline-outputs", express.static(path.join(process.cwd(), "pipeline_outputs")));
app.use(cookieParser());

app.use("/api", graphRoutes);
app.use("/api", certificateRoutes);
app.use("/api/v1", certificateRoutes);
app.use("/api/v1/video", videoCallRoutes);
app.use("/api/v1/notes", notesRoutes);
app.use("/api", mailerRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/courses", courseRoutes);
app.use("/api/v1/modules", moduleRoutes);
app.use("/api/v1/lessons", lessonRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/pipeline", pipelineRoutes);
app.use("/api/v1/courses", courseGenerationRoutes);
app.use("/api/v1/enrollments", enrollmentRouter);
app.use("/api/v1/progress", progressRouter);
app.use("/api/v1/discussions", discussionRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/admin", adminRouter);

app.use((err, req, res, next) => {
  const statusCode = err instanceof ApiError ? err.statusCode : 500;
  const message = err?.message || "Internal server error";

  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    data: null,
  });
});

export default app;
