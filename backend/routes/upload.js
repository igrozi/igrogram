import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { authenticate } from "../middleware/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// ГАРАНТИРОВАННОЕ СОЗДАНИЕ ПАПОК (дубль, но не помешает)
const uploadDirs = [
  "uploads",
  "uploads/avatars",
  "uploads/chat-images",
  "uploads/posts",
];
uploadDirs.forEach((dir) => {
  const fullPath = path.join(__dirname, "..", dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`📁 Created: ${fullPath}`);
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = "uploads";
    if (req.query.type === "avatar") folder = "uploads/avatars";
    else if (req.query.type === "chat") folder = "uploads/chat-images";
    else if (req.query.type === "post") folder = "uploads/posts";
    const fullPath = path.join(__dirname, "..", folder);
    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );
  const mimetype = allowedTypes.test(file.mimetype);
  if (mimetype && extname) cb(null, true);
  else cb(new Error("Only images are allowed"));
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
});

router.post("/", authenticate, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  // Определяем подпапку (нужна для правильного URL)
  let subfolder = "";
  if (req.query.type === "avatar") subfolder = "avatars";
  else if (req.query.type === "chat") subfolder = "chat-images";
  else if (req.query.type === "post") subfolder = "posts";

  // Протокол: если запрос пришёл через прокси (Railway), берём из заголовка
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.get("host");
  const url = `${protocol}://${host}/uploads/${subfolder ? subfolder + "/" : ""}${req.file.filename}`;

  console.log(`📎 File uploaded: ${url}`);
  res.json({ url });
});

export default router;
