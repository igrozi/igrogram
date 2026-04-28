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

// Создаём папки для загрузок (с полными правами)
const uploadDirs = [
  "uploads",
  "uploads/avatars",
  "uploads/chat-images",
  "uploads/posts",
];
uploadDirs.forEach((dir) => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true, mode: 0o755 });
    console.log(`📁 Created: ${fullPath}`);
  }
});

const app = express();
const httpServer = createServer(app);

// ----- НАСТРОЙКА CORS (БЕЗОПАСНО) -----
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// Функция проверки origin
const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) return true;
  return false;
};

const corsOptions = {
  origin: function (origin, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.log(`❌ CORS blocked: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  }),
);

app.use(express.json());

// ----- СТАТИЧЕСКИЕ ФАЙЛЫ ДЛЯ ИЗОБРАЖЕНИЙ (ИСПРАВЛЕНО) -----
// Сначала проверяем, существует ли папка uploads
const uploadsPath = path.join(__dirname, "uploads");
console.log(`📁 Uploads path: ${uploadsPath}`);
console.log(`📁 Uploads exists: ${fs.existsSync(uploadsPath)}`);

// Middleware для CORS на статические файлы
app.use("/uploads", (req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  next();
});

// Раздача статических файлов с правильными заголовками
app.use("/uploads", express.static(uploadsPath, {
  setHeaders: (res, filePath, stat) => {
    if (filePath.match(/\.(jpg|jpeg)$/i)) {
      res.setHeader("Content-Type", "image/jpeg");
    } else if (filePath.match(/\.png$/i)) {
      res.setHeader("Content-Type", "image/png");
    } else if (filePath.match(/\.gif$/i)) {
      res.setHeader("Content-Type", "image/gif");
    } else if (filePath.match(/\.webp$/i)) {
      res.setHeader("Content-Type", "image/webp");
    }
    res.setHeader("Cache-Control", "public, max-age=31536000");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  }
}));

// Логирование
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url} - Origin: ${req.headers.origin}`);
  next();
});

// ----- МАРШРУТЫ -----
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/ratings", ratingStatsRouter);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Проверка username
app.get("/api/users/check-username/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const result = await pool.query(
      "SELECT username FROM profiles WHERE username = $1",
      [username.toLowerCase()]
    );
    res.json({ 
      available: result.rows.length === 0,
      message: result.rows.length === 0 ? "Available" : "Username already taken"
    });
  } catch (error) {
    console.error("Error checking username:", error);
    res.status(500).json({ available: false, message: "Server error" });
  }
});

// Тестовый эндпоинт для проверки статических файлов
app.get("/uploads-test", (req, res) => {
  res.json({
    uploadsPath: uploadsPath,
    exists: fs.existsSync(uploadsPath),
    files: fs.existsSync(uploadsPath) ? fs.readdirSync(uploadsPath) : []
  });
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

// Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);
  socket.on("join", (userId) => {
    if (userId) socket.join(`user_${userId}`);
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
    if (data.chatId) {
      io.to(`user_${data.chatId}`).emit("message_deleted", {
        messageId: data.messageId,
      });
    }
  });
  socket.on("disconnect", () =>
    console.log("🔌 Client disconnected:", socket.id),
  );
});

// Запуск
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, "0.0.0.0", async () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ CORS_ORIGIN = ${process.env.CORS_ORIGIN || "not set"}`);
  console.log(`✅ Uploads path: ${uploadsPath}`);
  await initDatabase();
});