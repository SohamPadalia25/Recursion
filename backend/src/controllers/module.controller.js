import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Course } from "../models/course.model.js";
import { Module } from "../models/module.model.js";
import { Lesson } from "../models/lesson.model.js";

// POST /api/v1/modules
const createModule = asyncHandler(async (req, res) => {
  const { courseId, title, description = "", prerequisiteModule } = req.body;

  if (!courseId || !title) {
    throw new ApiError(400, "courseId and title are required");
  }

  const course = await Course.findById(courseId).select("instructor");
  if (!course) throw new ApiError(404, "Course not found");
  if (course.instructor.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only the instructor can add modules");
  }

  const lastModule = await Module.findOne({ course: courseId }).sort({ order: -1 });
  const order = lastModule ? lastModule.order + 1 : 1;

  const module = await Module.create({
    title,
    description,
    course: courseId,
    order,
    prerequisiteModule: prerequisiteModule || null,
    isLocked: Boolean(prerequisiteModule),
  });

  return res.status(201).json(new ApiResponse(201, module, "Module created successfully"));
});

// GET /api/v1/modules/course/:courseId
const getCourseModules = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const modules = await Module.find({ course: courseId })
    .sort({ order: 1 })
    .select("title description course order isLocked prerequisiteModule");

  return res.status(200).json(new ApiResponse(200, modules, "Modules fetched"));
});

// PATCH /api/v1/modules/:moduleId
const updateModule = asyncHandler(async (req, res) => {
  const { moduleId } = req.params;
  const { title, description = "", order, prerequisiteModule, isLocked } = req.body;

  const module = await Module.findById(moduleId);
  if (!module) throw new ApiError(404, "Module not found");

  const course = await Course.findById(module.course).select("instructor");
  if (!course) throw new ApiError(404, "Course not found");
  if (course.instructor.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only the instructor can update modules");
  }

  if (title !== undefined) module.title = title;
  if (description !== undefined) module.description = description;

  if (prerequisiteModule !== undefined) {
    module.prerequisiteModule = prerequisiteModule || null;
    // If prerequisite changes, lock state follows unless explicitly overridden.
    if (isLocked === undefined) module.isLocked = Boolean(prerequisiteModule);
  }

  if (isLocked !== undefined) module.isLocked = Boolean(isLocked);

  // Note: reordering many modules should be done via /reorder for uniqueness.
  if (order !== undefined) module.order = order;

  await module.save();

  return res.status(200).json(new ApiResponse(200, module, "Module updated successfully"));
});

// DELETE /api/v1/modules/:moduleId
const deleteModule = asyncHandler(async (req, res) => {
  const { moduleId } = req.params;

  const module = await Module.findById(moduleId);
  if (!module) throw new ApiError(404, "Module not found");

  const course = await Course.findById(module.course).select("instructor");
  if (!course) throw new ApiError(404, "Course not found");
  if (course.instructor.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only the instructor can delete modules");
  }

  await Lesson.deleteMany({ module: moduleId });
  await Module.findByIdAndDelete(moduleId);

  return res.status(200).json(new ApiResponse(200, {}, "Module deleted successfully"));
});

// PATCH /api/v1/modules/reorder
// Expected body: { modules: [{ moduleId, order }, ...] }
const reorderModules = asyncHandler(async (req, res) => {
  const { modules } = req.body;

  if (!Array.isArray(modules) || modules.length === 0) {
    throw new ApiError(400, "modules array is required");
  }

  // Update sequentially but safely: validate course ownership per module.
  await Promise.all(
    modules.map(async (m) => {
      const moduleId = m?.moduleId || m?.id;
      const nextOrder = m?.order;

      if (!moduleId || nextOrder === undefined) {
        throw new ApiError(400, "Each module must include moduleId and order");
      }

      const module = await Module.findById(moduleId).select("course");
      if (!module) throw new ApiError(404, "Module not found");

      const course = await Course.findById(module.course).select("instructor");
      if (!course) throw new ApiError(404, "Course not found");
      if (course.instructor.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Only the instructor can reorder modules");
      }

      module.order = nextOrder;
      await module.save();
    })
  );

  // Optional: return updated modules for the first module's course.
  const firstModuleId = modules[0]?.moduleId || modules[0]?.id;
  const firstModule = await Module.findById(firstModuleId).select("course");
  const updated = await Module.find({ course: firstModule.course }).sort({ order: 1 });

  return res.status(200).json(new ApiResponse(200, updated, "Modules reordered successfully"));
});

export { createModule, getCourseModules, updateModule, deleteModule, reorderModules };

