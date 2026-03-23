import dotenv from "dotenv";
import neo4j from "neo4j-driver";

dotenv.config(); // ✅ THIS LINE FIXES EVERYTHING

const neo4jUri = process.env.NEO4J_URI;
const neo4jUser = process.env.NEO4J_USER;
const neo4jPassword = process.env.NEO4J_PASSWORD;
const neo4jDatabase = process.env.NEO4J_DATABASE;

export const neo4jDriver =
  neo4jUri && neo4jUser && neo4jPassword
    ? neo4j.driver(
        neo4jUri,
        neo4j.auth.basic(neo4jUser, neo4jPassword),
        { disableLosslessIntegers: true }
      )
    : null;

export async function verifyNeo4jConnection() {
  if (!neo4jDriver) {
    throw new Error(
      "Neo4j is not fully configured. Set NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD."
    );
  }

  await neo4jDriver.verifyConnectivity();
  console.log("✅ Neo4j connected successfully");
}

export function createNeo4jSession() {
  if (!neo4jDriver) {
    return null;
  }

  return neo4jDatabase
    ? neo4jDriver.session({ database: neo4jDatabase })
    : neo4jDriver.session();
}