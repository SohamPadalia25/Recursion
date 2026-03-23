import { Router } from "express";
import {
  generateCourseStructure,
  saveCourseStructure,
  getCourseStructure,
} from "../controllers/courseGeneration.controller.js";

const router = Router();

/**
 * AI Route to generate course structure based on title & description
 */
router.post("/:courseId/generate-structure", generateCourseStructure);

/**
 * Save the generated structure to database
 */
router.post("/:courseId/save-structure", saveCourseStructure);

/**
 * Get the full course structure as tree
 */
router.get("/:courseId/structure", getCourseStructure);

export default router;
