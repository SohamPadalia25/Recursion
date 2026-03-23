import { createNeo4jSession, neo4jDriver } from "../config/neo4j.js";

const graphQuery = `
MATCH (root:Category {name: "Artificial Intelligence"})
CALL apoc.path.subgraphAll(root, {})
YIELD nodes, relationships
RETURN nodes, relationships
`;

const fallbackGraphQuery = `
MATCH (root:Category {name: "Artificial Intelligence"})
OPTIONAL MATCH p=(root)-[:HAS_SUBCATEGORY|HAS_COURSE*0..]->(n)
WITH collect(DISTINCT n) AS nodes, collect(p) AS paths
UNWIND paths AS path
UNWIND relationships(path) AS rel
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

    const transformedNodes = nodes.map((node) => {
      const labels = node.labels || [];
      const type = labels.includes("Course") ? "course" : "category";

      return {
        id: node.elementId,
        label: node.properties.name || node.properties.title || "Untitled",
        type,
      };
    });

    const transformedLinks = relationships.map((relationship) => ({
      source: relationship.startNodeElementId,
      target: relationship.endNodeElementId,
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
      WHERE elementId(course) = $id
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
