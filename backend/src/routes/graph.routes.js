import { Router } from "express";
import { getCourseById, getGraph } from "../controllers/graph.controller.js";

const router = Router();

router.get("/graph", getGraph);
router.get("/course/:id", getCourseById);

export default router;
