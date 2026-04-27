import express from "express";
import { pool } from "../db/pool.js";
import { authenticate } from "../middleware/auth.js";
import bcrypt from "bcryptjs";

const router = express.Router();

// Получить всех пользователей
router.get("/", authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, user_id, username, name, avatar_url, is_online, last_seen, bio, rating, rating_count FROM profiles ORDER BY name",
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error in getUsers:", error);
    res.status(500).json([]);
  }
});

// Поиск пользователей
router.get("/search", authenticate, async (req, res) => {
  const { q } = req.query;
  const userId = req.userId;

  try {
    const result = await pool.query(
      `SELECT id, user_id, username, name, avatar_url, is_online, last_seen
       FROM profiles 
       WHERE (name ILIKE $1 OR username ILIKE $1)
       AND user_id != $2
       LIMIT 20`,
      [`%${q}%`, userId],
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error in searchUsers:", error);
    res.status(500).json([]);
  }
});

// Проверка пароля
router.post("/verify-password", authenticate, async (req, res) => {
  const { userId, password } = req.body;
  const currentUserId = req.userId;

  if (userId !== currentUserId) {
    return res.status(403).json({ valid: false, message: "Unauthorized" });
  }

  try {
    const result = await pool.query(
      "SELECT password_hash FROM profiles WHERE user_id = $1",
      [userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ valid: false, message: "User not found" });
    }

    const user = result.rows[0];

    if (!user.password_hash) {
      return res
        .status(500)
        .json({ valid: false, message: "Invalid user data" });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    res.json({ valid: isValid });
  } catch (error) {
    console.error("Error verifying password:", error);
    res.status(500).json({ valid: false, error: error.message });
  }
});

// Оценить пользователя
router.post("/rate", authenticate, async (req, res) => {
  const { raterId, ratedUserId, score } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      "SELECT * FROM ratings WHERE rater_id = $1 AND rated_user_id = $2",
      [raterId, ratedUserId],
    );

    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Already rated" });
    }

    await client.query(
      "INSERT INTO ratings (rater_id, rated_user_id, score) VALUES ($1, $2, $3)",
      [raterId, ratedUserId, score],
    );

    await client.query(
      `UPDATE profiles 
       SET rating = (
         SELECT COALESCE(AVG(score), 0)::DECIMAL(3,1)
         FROM ratings 
         WHERE rated_user_id = $1
       ),
       rating_count = rating_count + 1,
       voted_users = array_append(voted_users, $2)
       WHERE user_id = $1`,
      [ratedUserId, raterId],
    );

    await client.query("COMMIT");
    res.json({ message: "Rated successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error in rateUser:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Получить профиль по username
router.get("/profile/:username", authenticate, async (req, res) => {
  const { username } = req.params;

  try {
    const result = await pool.query(
      "SELECT id, user_id, username, name, avatar_url, bio, is_online, last_seen, rating, rating_count, created_at, voted_users, phone, notifications FROM profiles WHERE username = $1",
      [username.toLowerCase()],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error in getProfile:", error);
    res.status(500).json({ error: error.message });
  }
});

// ===== ОБНОВЛЕНИЕ ПРОФИЛЯ (единственный и правильный, с поддержкой email) =====
router.put("/profile", authenticate, async (req, res) => {
  const {
    userId,
    name,
    bio,
    phone,
    notifications,
    avatar_url,
    email,
    is_online,
    last_seen,
  } = req.body;

  try {
    if (email) {
      const existing = await pool.query(
        "SELECT user_id FROM profiles WHERE email = $1 AND user_id != $2",
        [email, userId],
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: "Email already in use" });
      }
    }

    const result = await pool.query(
      `UPDATE profiles 
       SET name = COALESCE($1, name),
           bio = COALESCE($2, bio),
           phone = COALESCE($3, phone),
           notifications = COALESCE($4, notifications),
           avatar_url = COALESCE($5, avatar_url),
           email = COALESCE($6, email),
           is_online = COALESCE($8, is_online),
           last_seen = COALESCE($9, last_seen)
       WHERE user_id = $7
       RETURNING id, user_id, username, name, email, avatar_url, bio, phone, notifications`,
      [
        name,
        bio,
        phone,
        notifications,
        avatar_url,
        email,
        userId,
        is_online,
        last_seen,
      ],
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error in updateProfile:", error);
    res.status(500).json({ error: error.message });
  }
});

// Смена пароля
router.put("/change-password", authenticate, async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ error: "currentPassword and newPassword are required" });
  }

  try {
    const user = await pool.query(
      "SELECT password_hash FROM profiles WHERE user_id = $1",
      [userId],
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const valid = await bcrypt.compare(
      currentPassword,
      user.rows[0].password_hash,
    );
    if (!valid) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      "UPDATE profiles SET password_hash = $1 WHERE user_id = $2",
      [hashedPassword, userId],
    );

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error in changePassword:", error);
    res.status(500).json({ error: error.message });
  }
});

// Удаление аккаунта (должен быть последним из-за параметра :userId)
router.delete("/:userId", authenticate, async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.userId;

  if (userId !== currentUserId) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      "DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1",
      [userId],
    );
    await client.query("DELETE FROM comments WHERE author_id = $1", [userId]);
    await client.query("DELETE FROM posts WHERE author_id = $1", [userId]);
    await client.query(
      "DELETE FROM ratings WHERE rater_id = $1 OR rated_user_id = $1",
      [userId],
    );
    await client.query("DELETE FROM profiles WHERE user_id = $1", [userId]);

    await client.query("COMMIT");
    res.json({ success: true, message: "Account deleted successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error deleting account:", error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

export default router;
