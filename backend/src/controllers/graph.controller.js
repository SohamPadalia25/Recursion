import { createNeo4jSession, neo4jDriver } from "../config/neo4j.js";
import { Enrollment } from "../models/enrollment.model.js";
import { Course } from "../models/course.model.js";
import { Module } from "../models/module.model.js";
import { Lesson } from "../models/lesson.model.js";
import { Progress } from "../models/progress.model.js";

const graphQuery = `
MATCH (root:Category {name: "Learning Graph", source: "mongo-sync"})
OPTIONAL MATCH p=(root)-[:HAS_SUBCATEGORY|HAS_COURSE|HAS_MODULE|HAS_TOPIC|HAS_SUBTOPIC|HAS_LESSON|PREREQUISITE*0..]->(n)
WITH collect(DISTINCT root) + collect(DISTINCT n) AS nodes, collect(DISTINCT relationships(p)) AS relLists
UNWIND relLists AS relList
UNWIND relList AS rel
WITH nodes, collect(DISTINCT rel) AS relationships
RETURN nodes, relationships
`;

const fallbackGraphQuery = `
MATCH (root:Category)
OPTIONAL MATCH p=(root)-[:HAS_SUBCATEGORY|HAS_COURSE*0..]->(n)
WITH collect(DISTINCT root) + collect(DISTINCT n) AS nodes, collect(DISTINCT relationships(p)) AS relLists
UNWIND relLists AS relList
UNWIND relList AS rel
WITH nodes, collect(DISTINCT rel) AS relationships
RETURN nodes, relationships
`;

export async function getGraph(req, res) {
  if (!neo4jDriver) {
    return res.status(500).json({ message: "Neo4j is not configured on the server." });
  }

  const session = createNeo4jSession();

  try {
    let result;

    try {
      result = await session.run(graphQuery);
    } catch (error) {
      // Fallback for Neo4j setups where APOC plugin is not installed/enabled.
      if (error?.code === "Neo.ClientError.Procedure.ProcedureNotFound") {
        result = await session.run(fallbackGraphQuery);
      } else {
        throw error;
      }
    }

    if (!result.records.length) {
      return res.status(404).json({ message: "Graph root node not found." });
    }

    const record = result.records[0];
    const nodes = record.get("nodes");
    const relationships = record.get("relationships");

    const idByElementId = new Map();

    const transformedNodes = nodes.map((node) => {
      const labels = node.labels || [];
      const type = labels.includes("Course") ? "course" : "category";
      const normalizedId = node.properties.mongoId || node.elementId;

      idByElementId.set(node.elementId, normalizedId);

      return {
        id: normalizedId,
        label: node.properties.name || node.properties.title || "Untitled",
        type,
      };
    });

    const transformedLinks = relationships.map((relationship) => ({
      source: idByElementId.get(relationship.startNodeElementId) || relationship.startNodeElementId,
      target: idByElementId.get(relationship.endNodeElementId) || relationship.endNodeElementId,
    }));

    return res.status(200).json({
      nodes: transformedNodes,
      links: transformedLinks,
    });
  } catch (error) {
    console.error("Failed to fetch graph:", error);
    return res.status(500).json({ message: "Failed to fetch graph data." });
  } finally {
    await session.close();
  }
}

export async function getCourseById(req, res) {
  if (!neo4jDriver) {
    return res.status(500).json({ message: "Neo4j is not configured on the server." });
  }

  const session = createNeo4jSession();
  const { id } = req.params;

  try {
    const result = await session.run(
      `
      MATCH (course:Course)
      WHERE elementId(course) = $id OR course.mongoId = $id
      OPTIONAL MATCH (parent:Category)-[:HAS_SUBCATEGORY|HAS_COURSE]->(course)
      RETURN course, parent
      LIMIT 1
      `,
      { id }
    );

    if (!result.records.length) {
      return res.status(404).json({ message: "Course not found." });
    }

    const record = result.records[0];
    const course = record.get("course");
    const parent = record.get("parent");

    return res.status(200).json({
      id: course.elementId,
      name: course.properties.name || course.properties.title || "Untitled Course",
      description: course.properties.description || "No description available.",
      difficulty: course.properties.difficulty || "Not specified",
      duration: course.properties.duration || "Self-paced",
      parentCategory: parent ? parent.properties.name : null,
      metadata: course.properties,
    });
  } catch (error) {
    console.error("Failed to fetch course:", error);
    return res.status(500).json({ message: "Failed to fetch course details." });
  } finally {
    await session.close();
  }
}

function recordToObject(record, keys) {
  const output = {};
  for (const key of keys) {
    output[key] = record.get(key);
  }
  return output;
}

export async function getNeo4jInsights(req, res) {
  if (!neo4jDriver) {
    return res.status(500).json({ message: "Neo4j is not configured on the server." });
  }

  const studentId = req.query.studentId || "stu-001";
  const courseId = req.query.courseId || "course-001";
  const roadmapId = req.query.roadmapId || "road-001";
  const roleRoadmapId = req.query.roleRoadmapId || "road-004";

  const runQuery = async (query, params = {}) => {
    const querySession = createNeo4jSession();
    try {
      return await querySession.run(query, params);
    } finally {
      await querySession.close();
    }
  };

  try {
    const structureResult = await runQuery(
      `
      MATCH (c:Course {id:$courseId})-[:HAS_MODULE]->(m:Module)-[:HAS_TOPIC]->(t:Topic)
      RETURN c.title AS course,
             m.title AS module,
             m.order AS moduleOrder,
             t.title AS topic,
             t.order AS topicOrder,
             t.type  AS contentType
      ORDER BY m.order, t.order
      `,
      { courseId }
    );

    const coursesSummaryResult = await runQuery(
      `
      MATCH (c:Course)-[:HAS_MODULE]->(m:Module)
      RETURN c.id AS id,
             c.title AS title,
             c.level AS level,
             count(m) AS moduleCount,
             sum(m.durationMins) AS totalDurationMins
      ORDER BY c.title
      `
    );

    const masteryResult = await runQuery(
      `
      MATCH (s:Student {id:$studentId})-[m:HAS_MASTERY]->(cn:Concept)
      RETURN cn.name AS concept,
             cn.domain AS domain,
             m.score AS masteryScore,
             m.lastSeen AS lastSeen,
             CASE
               WHEN m.score >= 0.8 THEN 'mastered'
               WHEN m.score >= 0.5 THEN 'learning'
               ELSE 'struggling'
             END AS status
      ORDER BY m.score DESC
      `,
      { studentId }
    );

    const readyResult = await runQuery(
      `
      MATCH (s:Student {id:$studentId})-[m:HAS_MASTERY]->(known:Concept)
      WHERE m.score >= 0.7
      WITH s, collect(known.id) AS knownIds
      MATCH (next:Concept)
      WHERE NOT next.id IN knownIds
      WITH knownIds, next
      OPTIONAL MATCH (pre:Concept)-[:PREREQUISITE_FOR]->(next)
      WITH next, knownIds, collect(pre.id) AS prereqIds
      WHERE size(prereqIds) = 0
         OR ALL(pid IN prereqIds WHERE pid IN knownIds)
      RETURN next.name AS readyToLearn,
             next.domain AS domain,
             next.difficulty AS difficulty
      ORDER BY next.difficulty, next.name
      `,
      { studentId }
    );

    const decayingResult = await runQuery(
      `
      MATCH (s:Student {id:$studentId})-[m:HAS_MASTERY]->(cn:Concept)
      WHERE m.score > 0.5
        AND duration.between(m.lastSeen, datetime()).days >= 7
      RETURN cn.name AS concept,
             m.score AS currentMastery,
             duration.between(m.lastSeen, datetime()).days AS daysSinceReview
      ORDER BY daysSinceReview DESC
      `,
      { studentId }
    );

    const heatmapResult = await runQuery(
      `
      MATCH (s:Student {id:$studentId})-[m:HAS_MASTERY]->(cn:Concept)
      WITH cn.domain AS domain,
           avg(m.score) AS avgMastery,
           count(cn) AS conceptCount,
           min(m.score) AS weakestScore
      RETURN domain,
             round(avgMastery * 100) / 100 AS avgMastery,
             conceptCount,
             weakestScore
      ORDER BY avgMastery DESC
      `,
      { studentId }
    );

    const linearRoadmapResult = await runQuery(
      `
      MATCH (r:Roadmap {id:$roadmapId})-[rel:INCLUDES_COURSE]->(c:Course)
      RETURN r.title AS roadmap,
             rel.step AS step,
             c.title AS course,
             c.level AS level
      ORDER BY rel.step
      `,
      { roadmapId }
    );

    const studentRoadmapsResult = await runQuery(
      `
      MATCH (s:Student {id:$studentId})-[rp:ON_ROADMAP]->(r:Roadmap)
      MATCH (r)-[:INCLUDES_COURSE]->(c:Course)
      OPTIONAL MATCH (s)-[e:ENROLLED_IN]->(c)
      RETURN r.title AS roadmap,
             r.type AS type,
             rp.status AS status,
             count(c) AS total,
             count(CASE WHEN e.completedAt IS NOT NULL THEN 1 END) AS done,
             round(toFloat(count(CASE WHEN e.completedAt IS NOT NULL THEN 1 END)) / count(c) * 100) AS completionPct
      ORDER BY r.title
      `,
      { studentId }
    );

    const roleGapResult = await runQuery(
      `
      MATCH (r:Roadmap {id:$roleRoadmapId})-[:REQUIRES_CONCEPT]->(cn:Concept)
      OPTIONAL MATCH (s:Student {id:$studentId})-[m:HAS_MASTERY]->(cn)
      WITH cn, coalesce(m.score, 0) AS mastery
      WHERE mastery < 0.75
      RETURN cn.name AS conceptGap,
             cn.domain AS domain,
             round(mastery * 100) AS masteryPct
      ORDER BY mastery ASC
      `,
      { roleRoadmapId, studentId }
    );

    const studyDebtResult = await runQuery(
      `
      MATCH (s:Student {id:$studentId})-[m:HAS_MASTERY]->(cn:Concept)
      WITH s, m, cn, duration.between(m.lastSeen, datetime()).days AS d
      WITH s, sum(toFloat(d) * (1.0 - m.score) * cn.difficulty) AS rawDebt
      RETURN s.name AS student,
             round(rawDebt) AS studyDebtPoints,
             CASE
               WHEN rawDebt > 500 THEN 'critical'
               WHEN rawDebt > 200 THEN 'high'
               WHEN rawDebt > 50 THEN 'moderate'
               ELSE 'healthy'
             END AS debtStatus
      `,
      { studentId }
    );

    const data = {
      context: { studentId, courseId, roadmapId, roleRoadmapId },
      courseStructure: structureResult.records.map((r) =>
        recordToObject(r, ["course", "module", "moduleOrder", "topic", "topicOrder", "contentType"])
      ),
      coursesSummary: coursesSummaryResult.records.map((r) =>
        recordToObject(r, ["id", "title", "level", "moduleCount", "totalDurationMins"])
      ),
      mastery: masteryResult.records.map((r) =>
        recordToObject(r, ["concept", "domain", "masteryScore", "lastSeen", "status"])
      ),
      readyToLearn: readyResult.records.map((r) => recordToObject(r, ["readyToLearn", "domain", "difficulty"])),
      decayingConcepts: decayingResult.records.map((r) =>
        recordToObject(r, ["concept", "currentMastery", "daysSinceReview"])
      ),
      heatmap: heatmapResult.records.map((r) =>
        recordToObject(r, ["domain", "avgMastery", "conceptCount", "weakestScore"])
      ),
      linearRoadmap: linearRoadmapResult.records.map((r) =>
        recordToObject(r, ["roadmap", "step", "course", "level"])
      ),
      roadmapProgress: studentRoadmapsResult.records.map((r) =>
        recordToObject(r, ["roadmap", "type", "status", "total", "done", "completionPct"])
      ),
      roleGap: roleGapResult.records.map((r) => recordToObject(r, ["conceptGap", "domain", "masteryPct"])),
      studyDebt: studyDebtResult.records[0]
        ? recordToObject(studyDebtResult.records[0], ["student", "studyDebtPoints", "debtStatus"])
        : null,
    };

    return res.status(200).json(data);
  } catch (error) {
    console.error("Failed to fetch Neo4j insights:", error);
    return res.status(500).json({ message: "Failed to fetch Neo4j insights." });
  }
}

export async function getStudentProgressGraph(req, res) {
  try {
    const studentId = req.user?._id || req.query.studentId;

    if (!studentId) {
      return res.status(400).json({ message: "Student ID is required" });
    }

    // Get all enrolled courses for the student
    const enrollments = await Enrollment.find({ student: studentId })
      .lean()
      .populate("course", "_id title category");

    if (!enrollments.length) {
      return res.status(200).json({
        nodes: [],
        links: [],
        stats: {
          totalCourses: 0,
          completedCourses: 0,
          inProgressCourses: 0,
        },
      });
    }

    const courseIds = enrollments.map((e) => e.course._id);

    // Get all modules for the enrolled courses
    const modules = await Module.find({ course: { $in: courseIds } })
      .lean()
      .select("_id title course order");

    const moduleIds = modules.map((m) => m._id);

    // Get all lessons for these modules
    const lessons = await Lesson.find({ module: { $in: moduleIds } })
      .lean()
      .select("_id title module course order");

    const lessonIds = lessons.map((l) => l._id);

    // Get all progress records for these lessons
    const progressRecords = await Progress.find({
      student: studentId,
      lesson: { $in: lessonIds },
    })
      .lean()
      .select("lesson isCompleted");

    // Create lookup maps
    const progressMap = new Map();
    progressRecords.forEach((p) => {
      progressMap.set(p.lesson.toString(), p.isCompleted);
    });

    const modulesByLessonId = new Map();
    const lessonsByModuleId = new Map();
    const modulesByCourseId = new Map();

    modules.forEach((m) => {
      if (!modulesByCourseId.has(m.course.toString())) {
        modulesByCourseId.set(m.course.toString(), []);
      }
      modulesByCourseId.get(m.course.toString()).push(m);
    });

    lessons.forEach((l) => {
      modulesByLessonId.set(l._id.toString(), l.module.toString());
      if (!lessonsByModuleId.has(l.module.toString())) {
        lessonsByModuleId.set(l.module.toString(), []);
      }
      lessonsByModuleId.get(l.module.toString()).push(l);
    });

    // Build graph nodes and links
    const nodes = [];
    const links = [];
    const nodeIds = new Set();

    let completedCourses = 0;
    let inProgressCourses = 0;

    enrollments.forEach((enrollment) => {
      const courseId = enrollment.course._id.toString();
      const courseName = enrollment.course.title;
      const courseCategory = enrollment.course.category;

      // Get modules for this course
      const courseModules = modulesByCourseId.get(courseId) || [];
      const sortedModules = courseModules.sort((a, b) => a.order - b.order);

      if (sortedModules.length === 0) {
        // No modules, just add course node
        nodes.push({
          id: courseId,
          label: courseName,
          type: "course",
          color: "#e5e7eb", // gray - not started
          completionStatus: "not-started",
          completionPercentage: 0,
          category: courseCategory,
        });
        nodeIds.add(courseId);
        return;
      }

      // Calculate course completion
      let totalLessons = 0;
      let completedLessons = 0;

      const moduleCompletions = sortedModules.map((module) => {
        const moduleLessons = lessonsByModuleId.get(module._id.toString()) || [];
        const moduleCompletedLessons = moduleLessons.filter((lesson) =>
          progressMap.get(lesson._id.toString())
        ).length;

        totalLessons += moduleLessons.length;
        completedLessons += moduleCompletedLessons;

        return {
          moduleId: module._id.toString(),
          moduleName: module.title,
          order: module.order,
          totalLessons: moduleLessons.length,
          completedLessons: moduleCompletedLessons,
          completionPercentage:
            moduleLessons.length > 0
              ? Math.round((moduleCompletedLessons / moduleLessons.length) * 100)
              : 0,
        };
      });

      const courseCompletionPercentage =
        totalLessons > 0
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0;

      // Determine course completion status
      let courseColor = "#e5e7eb"; // gray - not started
      let courseStatus = "not-started";

      if (courseCompletionPercentage === 100) {
        courseColor = "#22c55e"; // green - completed
        courseStatus = "completed";
        completedCourses++;
      } else if (courseCompletionPercentage > 0) {
        courseColor = "#eab308"; // yellow - in progress
        courseStatus = "in-progress";
        inProgressCourses++;
      } else {
        inProgressCourses++;
      }

      // Add course node
      nodes.push({
        id: courseId,
        label: courseName,
        type: "course",
        color: courseColor,
        completionStatus: courseStatus,
        completionPercentage: courseCompletionPercentage,
        category: courseCategory,
      });
      nodeIds.add(courseId);

      // Add module nodes and course->module links
      moduleCompletions.forEach((moduleData) => {
        const moduleNodeId = moduleData.moduleId;

        // Determine module color
        let moduleColor = "#e5e7eb"; // gray
        let moduleStatus = "not-started";

        if (moduleData.completionPercentage === 100) {
          moduleColor = "#22c55e"; // green
          moduleStatus = "completed";
        } else if (moduleData.completionPercentage > 0) {
          moduleColor = "#eab308"; // yellow
          moduleStatus = "in-progress";
        }

        // Add module node
        nodes.push({
          id: moduleNodeId,
          label: moduleData.moduleName,
          type: "module",
          color: moduleColor,
          completionStatus: moduleStatus,
          completionPercentage: moduleData.completionPercentage,
          courseId: courseId,
        });
        nodeIds.add(moduleNodeId);

        // Add course->module link
        links.push({
          source: courseId,
          target: moduleNodeId,
          type: "HAS_MODULE",
        });

        // Add lesson nodes and module->lesson links
        const moduleLessons = lessonsByModuleId.get(moduleData.moduleId) || [];
        moduleLessons.sort((a, b) => a.order - b.order).forEach((lesson) => {
          const lessonNodeId = lesson._id.toString();
          const isCompleted = progressMap.get(lessonNodeId);

          const lessonColor = isCompleted ? "#22c55e" : "#e5e7eb";
          const lessonStatus = isCompleted ? "completed" : "not-started";

          nodes.push({
            id: lessonNodeId,
            label: lesson.title,
            type: "lesson",
            color: lessonColor,
            completionStatus: lessonStatus,
            completionPercentage: isCompleted ? 100 : 0,
            moduleId: moduleData.moduleId,
          });
          nodeIds.add(lessonNodeId);

          // Add module->lesson link
          links.push({
            source: moduleData.moduleId,
            target: lessonNodeId,
            type: "HAS_LESSON",
          });
        });
      });
    });

    return res.status(200).json({
      nodes,
      links,
      stats: {
        totalCourses: enrollments.length,
        completedCourses,
        inProgressCourses,
        totalNodes: nodeIds.size,
      },
    });
  } catch (error) {
    console.error("Failed to fetch student progress graph:", error);
    return res.status(500).json({
      message: "Failed to fetch student progress graph.",
      error: error.message,
    });
  }
}
