import dotenv from "dotenv"
import connectDB from "./db/db.js"
import app from "./app.js"
import dns from "node:dns"
import { verifyNeo4jConnection } from "./config/neo4j.js"

dotenv.config();

const configuredDnsServers = process.env.DNS_SERVERS
  ? process.env.DNS_SERVERS.split(",").map((s) => s.trim()).filter(Boolean)
  : ["8.8.8.8", "1.1.1.1"];

try {
  dns.setServers(configuredDnsServers);
  console.log(`Using DNS servers: ${configuredDnsServers.join(", ")}`);
} catch (error) {
  console.warn("Could not apply custom DNS servers", error?.message || error);
}

connectDB()
.then(async ()=>{
  try {
    await verifyNeo4jConnection();
    console.log("Neo4j connected successfully");
  } catch (error) {
    console.warn("Neo4j connection failed", error?.message || error);
  }

    app.listen(process.env.PORT || 8000,()=>{
        console.log(`Server running on port ${process.env.PORT}`);
    })
})
.catch((err)=>{
    console.log("MongoDB connection failed",err);
})

