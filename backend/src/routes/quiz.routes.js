import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isInstructor } from "../middlewares/role.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  createQuizBank,
  generateQuizBank,
  listMyQuizBanks,
  publishQuizBank,
  listPublishedQuizBanks,
  startQuizAttempt,
  submitQuizAttemptWithLogs,
} from "../controllers/quizBank.controller.js";

const router = Router();
router.use(verifyJWT);

router.get("/my", isInstructor, listMyQuizBanks);
router.post("/manual", isInstructor, createQuizBank);
router.post("/generate", isInstructor, upload.single("pdf"), generateQuizBank);
router.patch("/:quizId/publish", isInstructor, publishQuizBank);

router.get("/available", listPublishedQuizBanks);
router.post("/:quizId/start", startQuizAttempt);
router.post("/:quizId/submit", submitQuizAttemptWithLogs);

export default router;
