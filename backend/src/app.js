import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import graphRoutes from "./routes/graph.routes.js";
import videoCallRoutes from "./routes/videoCall.routes.js";
import notesRoutes from "./routes/notes.routes.js";
import mailerRoutes from "./routes/mailer.routes.js";
import certificateRoutes from "./routes/certificate.routes.js";

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
app.use(cookieParser());

app.use("/api", graphRoutes);
app.use("/api", certificateRoutes);
app.use("/api/v1/video", videoCallRoutes);
app.use("/api/v1/notes", notesRoutes);
app.use("/api", mailerRoutes);

export default app;
