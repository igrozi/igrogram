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
import { pool } from "./db/pool.js";

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
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Явно обрабатываем OPTIONS

// Helmet (можно временно отключить для диагностики)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

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
