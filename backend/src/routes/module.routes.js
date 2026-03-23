import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isInstructor } from "../middlewares/role.middleware.js";
import {
    createModule,
    getCourseModules,
    updateModule,
    deleteModule,
    reorderModules,
} from "../controllers/module.controller.js";

const router = Router();

router.route("/").post(verifyJWT, isInstructor, createModule);
router.route("/reorder").patch(verifyJWT, isInstructor, reorderModules);
router.route("/course/:courseId").get(getCourseModules);
router.route("/:moduleId").patch(verifyJWT, isInstructor, updateModule);
router.route("/:moduleId").delete(verifyJWT, isInstructor, deleteModule);

export default router;