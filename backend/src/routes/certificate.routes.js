import { Router } from "express";
import {
  verifyCompletion,
  issueCertificate,
  verifyCertificate,
  getCertificateForCourse,
} from "../controllers/certificate.controller.js";

const router = Router();

router.post("/verify-completion/:courseId", verifyCompletion);
router.post("/certificate/issue", issueCertificate);
router.get("/certificate/verify/:hash", verifyCertificate);
router.get("/certificate/course/:courseId", getCertificateForCourse);

export default router;
