import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { pool } from "./db/pool.js";

import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import messagesRoutes from "./routes/messages.js";
import postsRoutes from "./routes/posts.js";
import uploadRoutes from "./routes/upload.js";
import ratingStatsRouter from "./routes/ratingStats.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Инициализация БД
async function initDatabase() {
  try {
    const sqlPath = path.join(__dirname, "db", "init.sql");
    if (fs.existsSync(sqlPath)) {
      const sql = fs.readFileSync(sqlPath, "utf8");
      await pool.query(sql);
      console.log("✅ Database tables initialized");
    }
  } catch (err) {
    if (err.code === "42P07") {
      console.log("ℹ️ Tables already exist");
    } else {
      console.error("⚠️ DB init warning:", err.message);
    }
  }
}

const app = express();
const httpServer = createServer(app);

// CORS - полная и рабочая настройка
const allowedOrigins = [
  "https://igrogram.vercel.app",
  "https://igrogram-production.up.railway.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost"
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Маршруты
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/ratings", ratingStatsRouter);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

// 404
app.use("*", (req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.originalUrl}` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

// Socket.IO
const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, credentials: true }
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  socket.on("join", (userId) => {
    if (userId) socket.join(`user_${userId}`);
  });
  socket.on("send_message", (data) => {
    if (data.receiver_id) {
      io.to(`user_${data.receiver_id}`).emit("new_message", data);
      io.to(`user_${data.sender_id}`).emit("message_sent", data);
    }
  });
  socket.on("disconnect", () => console.log("Client disconnected:", socket.id));
});

// КРИТИЧНО: правильная привязка к порту
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Health check: /health`);
});

// Запускаем инициализацию БД после старта сервера
initDatabase();