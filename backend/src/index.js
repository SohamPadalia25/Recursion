import dotenv from "dotenv"
import connectDB from "./db/db.js"
import app from "./app.js"
import dns from "node:dns"
import { verifyNeo4jConnection } from "./config/neo4j.js"
import { createServer } from "http"
import { Server } from "socket.io"
import { setupVideoCallSocket } from "./utils/videoCallSocket.js"

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

    // Create HTTP server and attach Socket.io
    const httpServer = createServer(app);
    
    // Configure CORS for Socket.io (same as Express)
    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:8080",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:8080",
      process.env.CORS_ORIGIN === "*" ? "*" : process.env.CORS_ORIGIN
    ].filter(origin => origin && origin !== "undefined");
    
    const io = new Server(httpServer, {
      cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization']
      },
    });

    // Setup video call socket handlers
    setupVideoCallSocket(io);

    // Attach io to app for use in routes if needed
    app.set("io", io);

    httpServer.listen(process.env.PORT || 8000, () => {
        console.log(`Server running on port ${process.env.PORT || 8000}`);
        console.log(`Socket.io initialized on port ${process.env.PORT || 8000}`);
        console.log(`Allowed CORS origins:`, allowedOrigins);
    });
})
.catch((err)=>{
    console.log("MongoDB connection failed",err);
})


