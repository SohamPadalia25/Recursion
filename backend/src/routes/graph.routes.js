import { Router } from "express";
import { getCourseById, getGraph, getNeo4jInsights, getStudentProgressGraph } from "../controllers/graph.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/graph", getGraph);
router.get("/course/:id", getCourseById);
router.get("/neo4j/insights", getNeo4jInsights);
router.get("/student-progress", verifyJWT, getStudentProgressGraph);

export default router;
