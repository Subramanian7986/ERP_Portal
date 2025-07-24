const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const seedUsers = require("./seed");
const http = require("http");
const { Server } = require("socket.io");

dotenv.config();

async function ensureDatabaseAndTables() {
  // Connect to MySQL server (no DB yet)
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  // Create DB if not exists
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``
  );
  await connection.end();

  // Connect to the DB
  const db = await mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
  });

  // Read and run schema.sql, one statement at a time
  const schemaPath = path.join(__dirname, "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");
  const statements = schema
    .split(";")
    .map((stmt) => stmt.trim())
    .filter((stmt) => stmt.length > 0);
  for (const stmt of statements) {
    await db.query(stmt);
  }
  console.log("Database and tables ensured.");
  return db;
}

(async () => {
  const db = await ensureDatabaseAndTables();
  await seedUsers(db);

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRoutes(db));
  app.use("/api/admin", adminRoutes(db));

  // Create HTTP server and Socket.IO server
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Store online users: { userId: socketId }
  const onlineUsers = {};

  io.on("connection", (socket) => {
    // User joins with their userId
    socket.on("join", (userId) => {
      onlineUsers[userId] = socket.id;
      io.emit("online-users", Object.keys(onlineUsers));
    });

    // Handle sending a message
    socket.on("send-message", (data) => {
      // data: { to, from, content, groupId }
      if (data.to) {
        // Direct message
        const toSocket = onlineUsers[data.to];
        if (toSocket) {
          io.to(toSocket).emit("receive-message", data);
        }
      } else if (data.groupId) {
        // Group message: emit to all group members except sender
        // (Group logic to be implemented)
        io.emit("receive-group-message", data);
      }
    });

    // Typing indicator
    socket.on("typing", (data) => {
      // data: { to, from }
      const toSocket = onlineUsers[data.to];
      if (toSocket) {
        io.to(toSocket).emit("typing", data);
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      for (const [userId, sockId] of Object.entries(onlineUsers)) {
        if (sockId === socket.id) {
          delete onlineUsers[userId];
          break;
        }
      }
      io.emit("online-users", Object.keys(onlineUsers));
    });
  });

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (with Socket.IO)`);
  });
})();
