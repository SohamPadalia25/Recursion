import { createNeo4jSession, neo4jDriver } from "../config/neo4j.js";

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
