import express from 'express';
import { pool } from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Получить посты пользователя
router.get('/user/:userId', authenticate, async (req, res) => {
  const { userId } = req.params;
  
  try {
    const posts = await pool.query(
      `SELECT p.*, 
              pr.avatar_url as current_avatar_url
       FROM posts p
       LEFT JOIN profiles pr ON p.author_id = pr.user_id
       WHERE p.author_id = $1 
       ORDER BY p.is_pinned DESC, p.pinned_at DESC NULLS LAST, p.created_at DESC
       LIMIT 50`,
      [userId]
    );
    
    // Получить комментарии для каждого поста с актуальными аватарами
    const postsWithComments = await Promise.all(
      posts.rows.map(async (post) => {
        const comments = await pool.query(
          `SELECT c.*, 
                  pr.avatar_url as current_author_avatar
           FROM comments c
           LEFT JOIN profiles pr ON c.author_id = pr.user_id
           WHERE c.post_id = $1 
           ORDER BY c.created_at ASC`,
          [post.id]
        );
        
        // Используем актуальный аватар из профиля
        return { 
          ...post, 
          author_avatar: post.current_avatar_url || post.author_avatar,
          comments: comments.rows.map(c => ({
            ...c,
            author_avatar: c.current_author_avatar || c.author_avatar
          }))
        };
      })
    );
    
    res.json(postsWithComments);
  } catch (error) {
    console.error('Error in getUserPosts:', error);
    res.status(500).json([]);
  }
});

// Создать пост
router.post('/', authenticate, async (req, res) => {
  const { authorId, authorName, authorUsername, authorAvatar, content, imageUrl } = req.body;
  const userId = req.userId;
  
  try {
    // Получаем актуальный аватар из профиля
    const profile = await pool.query(
      'SELECT avatar_url FROM profiles WHERE user_id = $1',
      [authorId]
    );
    
    const currentAvatar = profile.rows[0]?.avatar_url || authorAvatar;
    
    const result = await pool.query(
      `INSERT INTO posts (author_id, author_name, author_username, author_avatar, content, image_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [authorId, authorName, authorUsername, currentAvatar, content, imageUrl]
    );
    res.status(201).json({ ...result.rows[0], comments: [] });
  } catch (error) {
    console.error('Error in createPost:', error);
    res.status(500).json({ error: error.message });
  }
});

// Обновить пост
router.put('/:postId', authenticate, async (req, res) => {
  const { postId } = req.params;
  const { content, isPinned } = req.body;
  const userId = req.userId;
  
  try {
    const check = await pool.query(
      'SELECT author_id FROM posts WHERE id = $1',
      [postId]
    );
    
    if (check.rows.length === 0 || check.rows[0].author_id !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    // Если isPinned передан в запросе
    let updateFields = [];
    let values = [];
    let paramIndex = 1;
    
    if (content !== undefined) {
      updateFields.push(`content = $${paramIndex}`);
      values.push(content);
      paramIndex++;
    }
    
    if (isPinned !== undefined) {
      updateFields.push(`is_pinned = $${paramIndex}`);
      values.push(isPinned);
      paramIndex++;
      
      // Устанавливаем pinned_at только при закреплении
      if (isPinned) {
        updateFields.push(`pinned_at = $${paramIndex}`);
        values.push(new Date().toISOString());
        paramIndex++;
      } else {
        updateFields.push(`pinned_at = $${paramIndex}`);
        values.push(null);
        paramIndex++;
      }
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    
    values.push(postId);
    
    const result = await pool.query(
      `UPDATE posts 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
    
    // Получаем актуальный аватар для ответа
    const profile = await pool.query(
      'SELECT avatar_url FROM profiles WHERE user_id = $1',
      [result.rows[0].author_id]
    );
    
    const response = {
      ...result.rows[0],
      author_avatar: profile.rows[0]?.avatar_url || result.rows[0].author_avatar
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error in updatePost:', error);
    res.status(500).json({ error: error.message });
  }
});

// Удалить пост
router.delete('/:postId', authenticate, async (req, res) => {
  const { postId } = req.params;
  const userId = req.userId;
  
  try {
    const result = await pool.query(
      'DELETE FROM posts WHERE id = $1 AND author_id = $2 RETURNING id',
      [postId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    res.json({ message: 'Post deleted' });
  } catch (error) {
    console.error('Error in deletePost:', error);
    res.status(500).json({ error: error.message });
  }
});

// Лайкнуть/убрать лайк
router.post('/:postId/like', authenticate, async (req, res) => {
  const { postId } = req.params;
  const userId = req.userId;
  
  try {
    const post = await pool.query('SELECT likes FROM posts WHERE id = $1', [postId]);
    const currentLikes = post.rows[0]?.likes || [];
    const hasLiked = currentLikes.includes(userId);
    
    const newLikes = hasLiked 
      ? currentLikes.filter(id => id !== userId)
      : [...currentLikes, userId];
    
    await pool.query('UPDATE posts SET likes = $1 WHERE id = $2', [newLikes, postId]);
    res.json({ likes: newLikes, hasLiked: !hasLiked });
  } catch (error) {
    console.error('Error in likePost:', error);
    res.status(500).json({ error: error.message });
  }
});

// Добавить комментарий
router.post('/:postId/comments', authenticate, async (req, res) => {
  const { postId } = req.params;
  const { authorId, authorName, authorAvatar, content, replyToId, replyToAuthor } = req.body;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Получаем актуальный аватар из профиля
    const profile = await client.query(
      'SELECT avatar_url FROM profiles WHERE user_id = $1',
      [authorId]
    );
    
    const currentAvatar = profile.rows[0]?.avatar_url || authorAvatar;
    
    const result = await client.query(
      `INSERT INTO comments (post_id, author_id, author_name, author_avatar, content, reply_to, reply_to_author)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [postId, authorId, authorName, currentAvatar, content, replyToId, replyToAuthor]
    );
    
    await client.query(
      'UPDATE posts SET comments_count = comments_count + 1 WHERE id = $1',
      [postId]
    );
    
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in addComment:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Удалить комментарий
router.delete("/comments/:commentId", authenticate, async (req, res) => {
  const { commentId } = req.params;
  const userId = req.userId; // 👈 должно быть получено из токена
  
  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");
    
    // Проверяем, что комментарий принадлежит пользователю
    const comment = await client.query(
      "SELECT post_id, author_id FROM comments WHERE id = $1",
      [commentId]
    );
    
    if (comment.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Comment not found" });
    }
    
    // 👇 ВАЖНО: проверяем, что автор комментария — текущий пользователь
    if (comment.rows[0].author_id !== userId) {
      await client.query("ROLLBACK");
      return res.status(403).json({ message: "Unauthorized" }); // ← вот откуда 403
    }
    
    await client.query("DELETE FROM comments WHERE id = $1", [commentId]);
    
    await client.query(
      "UPDATE posts SET comments_count = comments_count - 1 WHERE id = $1",
      [comment.rows[0].post_id]
    );
    
    await client.query("COMMIT");
    res.json({ message: "Comment deleted" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error in deleteComment:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

export default router;