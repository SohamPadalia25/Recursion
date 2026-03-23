import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../db/db.js";
import { neo4jDriver } from "../config/neo4j.js";
import { syncMongoGraphToNeo4j } from "./syncMongoToNeo4jGraph.js";

async function seed() {
  try {
    await connectDB();

    if (!neo4jDriver) {
      throw new Error("Missing Neo4j configuration. Set NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD.");
    }

    await neo4jDriver.verifyConnectivity();
    const stats = await syncMongoGraphToNeo4j({ clearExisting: true, rootName: "Learning Graph" });

    console.log("Neo4j sync completed successfully from MongoDB.");
    console.log(JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error("Neo4j sync failed:", error?.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    if (neo4jDriver) {
      await neo4jDriver.close();
    }
  }
}

seed();
