import express from 'express';
import { pool } from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/user/:userId', authenticate, async (req, res) => {
  const { userId } = req.params;
  
  try {
    const posts = await pool.query(
      `SELECT * FROM posts 
       WHERE author_id = $1 
       ORDER BY is_pinned DESC, pinned_at DESC, created_at DESC
       LIMIT 50`,
      [userId]
    );
    
    const postsWithComments = await Promise.all(
      posts.rows.map(async (post) => {
        const comments = await pool.query(
          `SELECT * FROM comments 
           WHERE post_id = $1 
           ORDER BY created_at ASC`,
          [post.id]
        );
        return { ...post, comments: comments.rows };
      })
    );
    
    res.json(postsWithComments);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', authenticate, async (req, res) => {
  const { authorId, authorName, authorUsername, authorAvatar, content, imageUrl } = req.body;
  
  try {
    const result = await pool.query(
      `INSERT INTO posts (author_id, author_name, author_username, author_avatar, content, image_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [authorId, authorName, authorUsername, authorAvatar, content, imageUrl]
    );
    res.status(201).json({ ...result.rows[0], comments: [] });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

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
    
    const pinnedAt = isPinned ? new Date().toISOString() : null;
    const result = await pool.query(
      `UPDATE posts 
       SET content = COALESCE($1, content),
           is_pinned = COALESCE($2, is_pinned),
           pinned_at = $3
       WHERE id = $4
       RETURNING *`,
      [content, isPinned, pinnedAt, postId]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

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
    res.status(500).json({ message: 'Server error' });
  }
});

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
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:postId/comments', authenticate, async (req, res) => {
  const { postId } = req.params;
  const { authorId, authorName, authorAvatar, content, replyToId, replyToAuthor } = req.body;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const result = await client.query(
      `INSERT INTO comments (post_id, author_id, author_name, author_avatar, content, reply_to, reply_to_author)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [postId, authorId, authorName, authorAvatar, content, replyToId, replyToAuthor]
    );
    
    await client.query(
      'UPDATE posts SET comments_count = comments_count + 1 WHERE id = $1',
      [postId]
    );
    
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

router.delete('/comments/:commentId', authenticate, async (req, res) => {
  const { commentId } = req.params;
  const userId = req.userId;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const comment = await client.query(
      'SELECT post_id, author_id FROM comments WHERE id = $1',
      [commentId]
    );
    
    if (comment.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    if (comment.rows[0].author_id !== userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    await client.query('DELETE FROM comments WHERE id = $1', [commentId]);
    await client.query(
      'UPDATE posts SET comments_count = comments_count - 1 WHERE id = $1',
      [comment.rows[0].post_id]
    );
    
    await client.query('COMMIT');
    res.json({ message: 'Comment deleted' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

export default router;