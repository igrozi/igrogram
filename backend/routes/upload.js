import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { authenticate } from "../middleware/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Создаём папки
const folders = ["uploads", "uploads/avatars", "uploads/chat-images", "uploads/posts"];
folders.forEach((folder) => {
  const fullPath = path.join(__dirname, "..", folder);
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
  const allowed = /jpeg|jpg|png|gif|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) cb(null, true);
  else cb(new Error("Only images allowed"));
};

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter });

router.post("/", authenticate, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  let sub = "";
  if (req.query.type === "avatar") sub = "avatars";
  else if (req.query.type === "chat") sub = "chat-images";
  else if (req.query.type === "post") sub = "posts";

  // Формируем правильный URL
  const host = req.get("host");
  const url = `https://${host}/uploads/${sub ? sub + "/" : ""}${req.file.filename}`;

  console.log(`✅ Uploaded: ${url}`);
  res.json({ url });
});

export default router;