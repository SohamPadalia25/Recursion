import { createNeo4jSession, neo4jDriver } from "../config/neo4j.js";
import { Course } from "../models/course.model.js";
import { Module } from "../models/module.model.js";
import { Topic } from "../models/topic.model.js";
import { Subtopic } from "../models/subtopic.model.js";
import { Lesson } from "../models/lesson.model.js";

const toId = (value) => String(value || "");

async function runWrite(session, query, params = {}) {
  await session.run(query, params);
}

export async function syncMongoGraphToNeo4j(options = {}) {
  const { clearExisting = true, rootName = "Learning Graph" } = options;

  if (!neo4jDriver) {
    throw new Error("Neo4j is not configured. Set NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD.");
  }

  const [courses, modules, topics, subtopics, lessons] = await Promise.all([
    Course.find({ status: { $ne: "archived" } })
      .populate("instructor", "fullname")
      .lean(),
    Module.find({}).lean(),
    Topic.find({}).lean(),
    Subtopic.find({}).lean(),
    Lesson.find({}).lean(),
  ]);

  const session = createNeo4jSession();
  if (!session) {
    throw new Error("Neo4j session could not be created.");
  }

  const stats = {
    courses: courses.length,
    modules: modules.length,
    topics: topics.length,
    subtopics: subtopics.length,
    lessons: lessons.length,
  };

  try {
    if (clearExisting) {
      await runWrite(session, "MATCH (n {source: 'mongo-sync'}) DETACH DELETE n");
    }

    await runWrite(
      session,
      "MERGE (root:Category {name: $rootName, source: 'mongo-sync'}) SET root.updatedAt = datetime()",
      { rootName }
    );

    for (const course of courses) {
      const courseId = toId(course._id);
      const categoryName = course.category || "General";

      await runWrite(
        session,
        `
        MERGE (cat:Category {name: $categoryName, source: 'mongo-sync'})
        SET cat.updatedAt = datetime()
        WITH cat
        MATCH (root:Category {name: $rootName, source: 'mongo-sync'})
        MERGE (root)-[:HAS_SUBCATEGORY]->(cat)
        `,
        { categoryName, rootName }
      );

      await runWrite(
        session,
        `
        MERGE (c:Course {mongoId: $mongoId})
        SET c.source = 'mongo-sync',
            c.title = $title,
            c.name = $title,
            c.description = $description,
            c.level = $level,
            c.language = $language,
            c.status = $status,
            c.isApproved = $isApproved,
            c.totalDuration = $totalDuration,
            c.duration = CASE WHEN $totalDuration > 0 THEN toString($totalDuration) + ' mins' ELSE 'Self-paced' END,
            c.instructorName = $instructorName,
            c.updatedAt = datetime()
        WITH c
        MATCH (cat:Category {name: $categoryName, source: 'mongo-sync'})
        MERGE (cat)-[:HAS_COURSE]->(c)
        `,
        {
          mongoId: courseId,
          title: course.title,
          description: course.description || "",
          level: course.level || "beginner",
          language: course.language || "English",
          status: course.status || "draft",
          isApproved: Boolean(course.isApproved),
          totalDuration: Number(course.totalDuration || 0),
          instructorName: course.instructor?.fullname || "Unknown",
          categoryName,
        }
      );
    }

    for (const moduleItem of modules) {
      await runWrite(
        session,
        `
        MERGE (m:Module {mongoId: $mongoId})
        SET m.source = 'mongo-sync',
            m.title = $title,
            m.description = $description,
            m.order = $order,
            m.updatedAt = datetime()
        WITH m
        MATCH (c:Course {mongoId: $courseId})
        MERGE (c)-[:HAS_MODULE]->(m)
        `,
        {
          mongoId: toId(moduleItem._id),
          title: moduleItem.title,
          description: moduleItem.description || "",
          order: Number(moduleItem.order || 0),
          courseId: toId(moduleItem.course),
        }
      );

      if (moduleItem.prerequisiteModule) {
        await runWrite(
          session,
          `
          MATCH (m:Module {mongoId: $moduleId})
          MATCH (p:Module {mongoId: $prereqId})
          MERGE (m)-[:PREREQUISITE]->(p)
          `,
          {
            moduleId: toId(moduleItem._id),
            prereqId: toId(moduleItem.prerequisiteModule),
          }
        );
      }
    }

    for (const topic of topics) {
      await runWrite(
        session,
        `
        MERGE (t:Topic {mongoId: $mongoId})
        SET t.source = 'mongo-sync',
            t.title = $title,
            t.description = $description,
            t.order = $order,
            t.difficulty = $difficulty,
            t.estimatedDuration = $estimatedDuration,
            t.updatedAt = datetime()
        WITH t
        MATCH (m:Module {mongoId: $moduleId})
        MERGE (m)-[:HAS_TOPIC]->(t)
        `,
        {
          mongoId: toId(topic._id),
          title: topic.title,
          description: topic.description || "",
          order: Number(topic.order || 0),
          difficulty: topic.difficulty || "medium",
          estimatedDuration: Number(topic.estimatedDuration || 0),
          moduleId: toId(topic.module),
        }
      );

      if (Array.isArray(topic.prerequisites)) {
        for (const prereqTopicId of topic.prerequisites) {
          await runWrite(
            session,
            `
            MATCH (t:Topic {mongoId: $topicId})
            MATCH (p:Topic {mongoId: $prereqTopicId})
            MERGE (t)-[:PREREQUISITE]->(p)
            `,
            {
              topicId: toId(topic._id),
              prereqTopicId: toId(prereqTopicId),
            }
          );
        }
      }
    }

    for (const subtopic of subtopics) {
      await runWrite(
        session,
        `
        MERGE (s:Subtopic {mongoId: $mongoId})
        SET s.source = 'mongo-sync',
            s.title = $title,
            s.description = $description,
            s.order = $order,
            s.difficulty = $difficulty,
            s.estimatedDuration = $estimatedDuration,
            s.isOptional = $isOptional,
            s.updatedAt = datetime()
        WITH s
        MATCH (t:Topic {mongoId: $topicId})
        MERGE (t)-[:HAS_SUBTOPIC]->(s)
        `,
        {
          mongoId: toId(subtopic._id),
          title: subtopic.title,
          description: subtopic.description || "",
          order: Number(subtopic.order || 0),
          difficulty: subtopic.difficulty || "medium",
          estimatedDuration: Number(subtopic.estimatedDuration || 0),
          isOptional: Boolean(subtopic.isOptional),
          topicId: toId(subtopic.topic),
        }
      );

      if (Array.isArray(subtopic.prerequisites)) {
        for (const prereqSubtopicId of subtopic.prerequisites) {
          await runWrite(
            session,
            `
            MATCH (s:Subtopic {mongoId: $subtopicId})
            MATCH (p:Subtopic {mongoId: $prereqSubtopicId})
            MERGE (s)-[:PREREQUISITE]->(p)
            `,
            {
              subtopicId: toId(subtopic._id),
              prereqSubtopicId: toId(prereqSubtopicId),
            }
          );
        }
      }
    }

    for (const lesson of lessons) {
      await runWrite(
        session,
        `
        MERGE (l:Lesson {mongoId: $mongoId})
        SET l.source = 'mongo-sync',
            l.title = $title,
            l.description = $description,
            l.order = $order,
            l.durationSeconds = $durationSeconds,
            l.videoUrl = $videoUrl,
            l.updatedAt = datetime()
        WITH l
        MATCH (m:Module {mongoId: $moduleId})
        MERGE (m)-[:HAS_LESSON]->(l)
        `,
        {
          mongoId: toId(lesson._id),
          title: lesson.title,
          description: lesson.description || "",
          order: Number(lesson.order || 0),
          durationSeconds: Number(lesson.duration || 0),
          videoUrl: lesson.videoUrl || "",
          moduleId: toId(lesson.module),
        }
      );
    }

    return stats;
  } finally {
    await session.close();
  }
}
