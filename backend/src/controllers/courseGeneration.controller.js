/**
 * AI Course Generation Controller
 * Generates course structure (modules, topics, subtopics, learning outcomes)
 * using AI based on course title and description
 */

import { Module } from "../models/module.model.js";
import { Topic } from "../models/topic.model.js";
import { Subtopic } from "../models/subtopic.model.js";
import { Course } from "../models/course.model.js";

/**
 * Generate course structure using AI
 * POST /api/courses/:courseId/generate-structure
 *
 * Request body:
 * {
 *   title: "Course Title",
 *   description: "Course Description"
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     modules: [
 *       {
 *         name: "Module 1",
 *         description: "...",
 *         topics: [
 *           {
 *             name: "Topic 1",
 *             difficulty: "easy",
 *             learningOutcomes: [...],
 *             subtopics: [...]
 *           }
 *         ]
 *       }
 *     ]
 *   }
 * }
 */
export const generateCourseStructure = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, description } = req.body;

    // Validate input
    if (!title || !description) {
      return res
        .status(400)
        .json({ success: false, message: "Title and description required" });
    }

    // Verify course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    // TODO: Call LLM API (e.g., OpenAI, Claude, etc.) to generate structure
    // For now, return a mock structure
    const generatedStructure = generateMockStructure(title, description);

    return res
      .status(200)
      .json({ success: true, data: generatedStructure });
  } catch (error) {
    console.error("Error generating course structure:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to generate course structure" });
  }
};

/**
 * Save generated structure to database
 * POST /api/courses/:courseId/save-structure
 * 
 * Request body:
 * {
 *   modules: [{...}]
 * }
 */
export const saveCourseStructure = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { modules } = req.body;

    if (!Array.isArray(modules) || modules.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Modules array required" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    const savedModules = [];

    for (const [moduleIndex, moduleData] of modules.entries()) {
      // Create module
      const module = new Module({
        title: moduleData.name,
        description: moduleData.description || "",
        course: courseId,
        order: moduleIndex + 1,
      });
      await module.save();
      savedModules.push(module);

      // Create topics within module
      if (Array.isArray(moduleData.topics)) {
        for (const [topicIndex, topicData] of moduleData.topics.entries()) {
          const topic = new Topic({
            title: topicData.name,
            description: topicData.description || "",
            module: module._id,
            course: courseId,
            order: topicIndex + 1,
            difficulty: topicData.difficulty || "medium",
            learningOutcomes: topicData.learning_outcomes || [],
            estimatedDuration: topicData.estimated_duration || 0,
          });
          await topic.save();

          // Create subtopics within topic
          if (Array.isArray(topicData.subtopics)) {
            for (const [subtopicIndex, subtopicData] of topicData.subtopics.entries()) {
              const subtopic = new Subtopic({
                title: subtopicData.name,
                description: subtopicData.description || "",
                topic: topic._id,
                module: module._id,
                course: courseId,
                order: subtopicIndex + 1,
                difficulty: subtopicData.difficulty || "medium",
                learningOutcomes: subtopicData.learning_outcomes || [],
                estimatedDuration: subtopicData.estimated_duration || 0,
                isOptional: subtopicData.is_optional || false,
              });
              await subtopic.save();
            }
          }
        }
      }
    }

    return res.status(201).json({
      success: true,
      message: "Course structure saved successfully",
      data: { moduleCount: savedModules.length },
    });
  } catch (error) {
    console.error("Error saving course structure:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to save course structure" });
  }
};

/**
 * Get full course structure as tree
 * GET /api/courses/:courseId/structure
 */
export const getCourseStructure = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    const modules = await Module.find({ course: courseId }).sort({ order: 1 });

    const structure = await Promise.all(
      modules.map(async (module) => {
        const topics = await Topic.find({ module: module._id })
          .populate("prerequisites")
          .sort({ order: 1 });

        const topicsWithSubtopics = await Promise.all(
          topics.map(async (topic) => {
            const subtopics = await Subtopic.find({ topic: topic._id })
              .populate("prerequisites")
              .sort({ order: 1 });

            return {
              _id: topic._id,
              title: topic.title,
              description: topic.description,
              difficulty: topic.difficulty,
              learningOutcomes: topic.learningOutcomes,
              prerequisites: topic.prerequisites,
              estimatedDuration: topic.estimatedDuration,
              subtopics: subtopics.map((st) => ({
                _id: st._id,
                title: st.title,
                description: st.description,
                difficulty: st.difficulty,
                learningOutcomes: st.learningOutcomes,
                prerequisites: st.prerequisites,
                estimatedDuration: st.estimatedDuration,
                isOptional: st.isOptional,
              })),
            };
          })
        );

        return {
          _id: module._id,
          title: module.title,
          description: module.description,
          order: module.order,
          topics: topicsWithSubtopics,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: { course: course.title, modules: structure },
    });
  } catch (error) {
    console.error("Error fetching course structure:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch course structure" });
  }
};

/**
 * Mock AI structure generator
 * Replace this with actual LLM integration
 */
function generateMockStructure(title, description) {
  return {
    modules: [
      {
        name: "Introduction & Fundamentals",
        description: "Get started with the basics",
        topics: [
          {
            name: "Course Overview",
            difficulty: "easy",
            description: "Understand what you'll learn",
            learning_outcomes: [
              { description: "Define the course scope", bloomLevel: "remember" },
              { description: "Identify key learning goals", bloomLevel: "understand" },
            ],
            estimated_duration: 15,
            subtopics: [
              {
                name: "What is this course?",
                difficulty: "easy",
                description: "Learn the basics",
                learning_outcomes: [
                  { description: "Understand core concepts", bloomLevel: "understand" },
                ],
                estimated_duration: 10,
                is_optional: false,
              },
            ],
          },
          {
            name: "Prerequisites & Setup",
            difficulty: "easy",
            description: "Prepare your environment",
            learning_outcomes: [
              { description: "Set up required tools", bloomLevel: "apply" },
            ],
            estimated_duration: 20,
            subtopics: [
              {
                name: "Installation Guide",
                difficulty: "easy",
                description: "Step-by-step setup",
                learning_outcomes: [
                  { description: "Successfully install all tools", bloomLevel: "apply" },
                ],
                estimated_duration: 15,
                is_optional: false,
              },
            ],
          },
        ],
      },
      {
        name: "Core Concepts",
        description: "Master the main concepts",
        topics: [
          {
            name: "Deep Dive into Core",
            difficulty: "medium",
            description: "Comprehensive exploration",
            learning_outcomes: [
              { description: "Analyze core concepts", bloomLevel: "analyze" },
            ],
            estimated_duration: 45,
            subtopics: [
              {
                name: "Key Architecture",
                difficulty: "medium",
                description: "Understand system design",
                learning_outcomes: [
                  { description: "Design solutions using core concepts", bloomLevel: "create" },
                ],
                estimated_duration: 30,
                is_optional: false,
              },
              {
                name: "Advanced Patterns",
                difficulty: "hard",
                description: "Advanced techniques",
                learning_outcomes: [
                  { description: "Apply advanced patterns", bloomLevel: "apply" },
                ],
                estimated_duration: 25,
                is_optional: true,
              },
            ],
          },
        ],
      },
    ],
  };
}
