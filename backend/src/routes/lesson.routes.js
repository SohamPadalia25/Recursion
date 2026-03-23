import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isInstructor } from "../middlewares/role.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
    createLesson,
    getLesson,
    updateLesson,
    deleteLesson,
    addResource,
    getModuleLessons,
} from "../controllers/lesson.controller.js";

const router = Router();

router.route("/").post(verifyJWT, isInstructor, upload.single("video"), createLesson);
router.route("/module/:moduleId").get(getModuleLessons);
router.route("/:lessonId").get(verifyJWT, getLesson);
router.route("/:lessonId").patch(verifyJWT, isInstructor, upload.single("video"), updateLesson);
router.route("/:lessonId").delete(verifyJWT, isInstructor, deleteLesson);
router.route("/:lessonId/resource").patch(verifyJWT, isInstructor, addResource);

export default router;