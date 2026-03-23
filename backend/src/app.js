import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser"
import graphRoutes from "./routes/graph.routes.js";
import videoCallRoutes from "./routes/videoCall.routes.js";
import notesRoutes from "./routes/notes.routes.js";
import mailerRoutes from "./routes/mailer.routes.js";

const app=express();

// Configure CORS to allow frontend requests
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:8080",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8080",
  process.env.CORS_ORIGIN === "*" ? "*" : process.env.CORS_ORIGIN
].filter(origin => origin && origin !== "undefined");

console.log("Allowed CORS origins:", allowedOrigins);

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json({limit:"16kb"})) //accept data in json format with specified limit

app.use(express.urlencoded({extended:true,limit:"16kb"})) //to handle data that comes from urls and forms

app.use(express.static("public")) //all static files are in public folder

app.use(cookieParser())

//routes import 

//routes declaration
app.use("/api", graphRoutes)
app.use("/api/v1/video", videoCallRoutes);
app.use("/api/v1/notes", notesRoutes);
app.use("/api", mailerRoutes)

export default app;