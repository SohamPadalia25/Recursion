import { Router } from "express";
import { getCourseById, getGraph, getNeo4jInsights } from "../controllers/graph.controller.js";

const router = Router();

router.get("/graph", getGraph);
router.get("/course/:id", getCourseById);
router.get("/neo4j/insights", getNeo4jInsights);

export default router;
