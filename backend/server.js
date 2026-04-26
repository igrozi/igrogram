import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import messagesRoutes from "./routes/messages.js";
import postsRoutes from "./routes/posts.js";
import uploadRoutes from "./routes/upload.js";
import ratingStatsRouter from "./routes/ratingStats.js";
import fs from "fs";
import { pool } from "./db/pool.js"; // Не забудьте импортировать pool!

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Инициализация БД
async function initDatabase() {
  try {
    const sqlPath = path.join(__dirname, "db", "init.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");
    await pool.query(sql);
    console.log("✅ Database tables initialized");
  } catch (err) {
    if (err.code === "42P07") {
      console.log("ℹ️ Tables already exist, skipping init");
    } else {
      console.error("⚠️ DB init warning:", err.message);
    }
  }
}
initDatabase();

const app = express();
const httpServer = createServer(app);

// ----- НАСТРОЙКА CORS (ДО ВСЕХ МАРШРУТОВ) -----
// Разрешённые источники (из переменной окружения или по умолчанию)
const allowedOrigins = process.env.CORS_ORIGIN?.split(",") || [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost",
];

const corsOptions = {
  origin: function (origin, callback) {
    // Разрешаем запросы без origin (например, из Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Важно для отправки cookies / Authorization
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Явно обрабатываем preflight

// Helmet настраиваем после CORS и не блокируем нужные заголовки
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  }),
);

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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

// 404
app.use("*", (req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.originalUrl}` });
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

// ----- SOCKET.IO -----
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("join", (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
      console.log(`User ${userId} joined room`);
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
    console.log("Delete message event:", data);
    if (data.chatId) {
      io.to(`user_${data.chatId}`).emit("message_deleted", {
        messageId: data.messageId,
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(
    `📍 Health check: https://igrogram-production.up.railway.app/health`,
  );
});
