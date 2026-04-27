import express from "express";
import { pool } from "../db/pool.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Получить сообщения с пользователем
router.get("/:userId", authenticate, async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.userId;

  try {
    const result = await pool.query(
      `SELECT m.*, 
        p.name as sender_name, p.avatar_url as sender_avatar
       FROM messages m
       LEFT JOIN profiles p ON m.sender_id = p.user_id
       WHERE (m.sender_id = $1 AND m.receiver_id = $2) 
          OR (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.created_at ASC
       LIMIT 100`,
      [currentUserId, userId],
    );
    res.json(result.rows || []);
  } catch (error) {
    console.error("Error in getMessages:", error);
    res.status(500).json([]);
  }
});

// Отправить сообщение
router.post("/", authenticate, async (req, res) => {
  const { receiverId, body, imageUrl, replyToId, replyToBody, replyToSender } =
    req.body;
  const senderId = req.userId;

  try {
    const senderInfo = await pool.query(
      "SELECT name, avatar_url FROM profiles WHERE user_id = $1",
      [senderId],
    );

    const result = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, body, image_url, reply_to, reply_to_body, reply_to_sender)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        senderId,
        receiverId,
        body,
        imageUrl,
        replyToId,
        replyToBody,
        replyToSender,
      ],
    );

    const newMessage = {
      ...result.rows[0],
      sender_name: senderInfo.rows[0]?.name,
      sender_avatar: senderInfo.rows[0]?.avatar_url,
    };

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessage:", error);
    res.status(500).json({ error: error.message });
  }
});

// Отметить как прочитанные
router.put("/read/:senderId", authenticate, async (req, res) => {
  const { senderId } = req.params;
  const receiverId = req.userId;
  try {
    const result = await pool.query(
      `UPDATE messages 
       SET is_read = true 
       WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false
       RETURNING id`,
      [senderId, receiverId],
    );
    console.log(
      `📖 Marked ${result.rowCount} messages as read from ${senderId} to ${receiverId}`,
    );
    res.json({ message: "Messages marked as read", count: result.rowCount });
  } catch (error) {
    console.error("Error in markAsRead:", error);
    res.status(500).json({ error: error.message });
  }
});

// Удалить сообщение - обновляем все ответы на него
router.delete("/:messageId", authenticate, async (req, res) => {
  const { messageId } = req.params;
  const userId = req.userId;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Проверяем, существует ли сообщение и принадлежит ли пользователю
    const message = await client.query(
      "SELECT id FROM messages WHERE id = $1 AND sender_id = $2",
      [messageId, userId],
    );

    if (message.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Message not found" });
    }

    // Обновляем все сообщения, которые отвечают на это сообщение
    await client.query(
      `UPDATE messages 
       SET reply_to_body = NULL,
           reply_to_sender = NULL
       WHERE reply_to = $1`,
      [messageId],
    );

    // Удаляем сообщение
    await client.query("DELETE FROM messages WHERE id = $1", [messageId]);

    await client.query("COMMIT");
    res.json({ message: "Message deleted" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error in deleteMessage:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Получить чаты с последним сообщением
router.get("/chats/list", authenticate, async (req, res) => {
  const userId = req.userId;

  try {
    const chatUsersResult = await pool.query(
      `SELECT DISTINCT 
         CASE 
           WHEN sender_id = $1 THEN receiver_id
           ELSE sender_id
         END as contact_id
       FROM messages
       WHERE sender_id = $1 OR receiver_id = $1`,
      [userId],
    );

    const contactIds = chatUsersResult.rows.map((row) => row.contact_id);

    if (contactIds.length === 0) {
      return res.json([]);
    }

    const profilesResult = await pool.query(
      `SELECT id, user_id, username, name, avatar_url, is_online, last_seen
       FROM profiles
       WHERE user_id = ANY($1::text[])`,
      [contactIds],
    );

    const chats = await Promise.all(
      profilesResult.rows.map(async (contact) => {
        const lastMsgResult = await pool.query(
          `SELECT id, body, image_url, created_at, sender_id, is_read
           FROM messages
           WHERE (sender_id = $1 AND receiver_id = $2) 
              OR (sender_id = $2 AND receiver_id = $1)
           ORDER BY created_at DESC
           LIMIT 1`,
          [userId, contact.user_id],
        );

        const unreadResult = await pool.query(
          `SELECT COUNT(*) as count
           FROM messages
           WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false`,
          [contact.user_id, userId],
        );

        const lastMessage = lastMsgResult.rows[0] || null;
        const unreadCount = parseInt(unreadResult.rows[0].count);

        return {
          ...contact,
          unread_count: unreadCount,
          last_message: lastMessage,
        };
      }),
    );

    chats.sort((a, b) => {
      const dateA = a.last_message
        ? new Date(a.last_message.created_at)
        : new Date(0);
      const dateB = b.last_message
        ? new Date(b.last_message.created_at)
        : new Date(0);
      return dateB - dateA;
    });

    res.json(chats);
  } catch (error) {
    console.error("Error in getChats:", error);
    res.status(500).json([]);
  }
});

export default router;
