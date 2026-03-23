import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  runLearningPipeline,
  getPipelineJobStatus,
} from "../controllers/pipeline.controller.js";

const router = Router();

router.use(verifyJWT);
router.post("/generate", upload.single("pdf"), runLearningPipeline);
router.get("/status/:jobId", getPipelineJobStatus);

export default router;
