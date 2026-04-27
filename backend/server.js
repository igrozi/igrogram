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

const app = express();
const httpServer = createServer(app);

// ===== КРИТИЧНО: CORS НАСТРОЙКА ПЕРВОЙ =====
app.use((req, res, next) => {
  const origin = req.headers.origin;
  // Разрешаем все источники для теста
  res.header("Access-Control-Allow-Origin", origin || "*");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  
  // Обрабатываем preflight запросы
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());
app.use(helmet({ 
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ===== МАРШРУТЫ =====
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/ratings", ratingStatsRouter);

// ===== HEALTH CHECK =====
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

// ===== 404 =====
app.use("*", (req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.originalUrl}` });
});

// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

// ===== ИНИЦИАЛИЗАЦИЯ БД =====
async function initDatabase() {
  try {
    const sqlPath = path.join(__dirname, "db", "init.sql");
    if (fs.existsSync(sqlPath)) {
      const sql = fs.readFileSync(sqlPath, "utf8");
      await pool.query(sql);
      console.log("✅ Database tables initialized");
    } else {
      console.log("ℹ️ init.sql not found, skipping");
    }
  } catch (err) {
    if (err.code === "42P07") {
      console.log("ℹ️ Tables already exist");
    } else {
      console.error("⚠️ DB init warning:", err.message);
    }
  }
}

// ===== SOCKET.IO =====
const io = new Server(httpServer, {
  cors: { 
    origin: true, 
    credentials: true,
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  socket.on("join", (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
      console.log(`👤 User ${userId} joined room`);
    }
  });

  socket.on("send_message", (data) => {
    if (data.receiver_id) {
      io.to(`user_${data.receiver_id}`).emit("new_message", data);
      io.to(`user_${data.sender_id}`).emit("message_sent", data);
    }
  });

  socket.on("typing", (data) => {
    if (data.receiver_id) {
      socket.to(`user_${data.receiver_id}`).emit("user_typing", {
        sender_id: data.sender_id,
        sender_name: data.sender_name,
      });
    }
  });

  socket.on("mark_read", (data) => {
    if (data.sender_id) {
      io.to(`user_${data.sender_id}`).emit("messages_read", {
        receiver_id: data.receiver_id,
      });
    }
  });

  socket.on("delete_message", (data) => {
    console.log("🗑️ Delete message event:", data);
    if (data.chatId) {
      io.to(`user_${data.chatId}`).emit("message_deleted", {
        messageId: data.messageId,
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("🔌 Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;

// Явно слушаем все интерфейсы и выводим реальный порт
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Server listening on 0.0.0.0:${PORT}`);
  console.log(`✅ Health check available at /health`);
});

// Ждём запуска сервера, потом инициализируем БД
initDatabase().catch(console.error);

// Экспортируем для Railway (важно!)
export default app;