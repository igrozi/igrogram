import express from 'express';
import { pool } from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Получить всех пользователей
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, user_id, username, name, avatar_url, is_online, last_seen, bio, rating, rating_count FROM profiles ORDER BY name'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error in getUsers:', error);
    res.status(500).json([]);
  }
});

// Получить профиль по username
router.get('/profile/:username', authenticate, async (req, res) => {
  const { username } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT id, user_id, username, name, avatar_url, bio, is_online, last_seen, rating, rating_count, created_at, voted_users, phone, notifications FROM profiles WHERE username = $1',
      [username.toLowerCase()]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error in getProfile:', error);
    res.status(500).json({ error: error.message });
  }
});

// Обновить профиль
router.put('/profile', authenticate, async (req, res) => {
  const { userId, name, bio, phone, notifications, avatar_url } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE profiles 
       SET name = COALESCE($1, name),
           bio = COALESCE($2, bio),
           phone = COALESCE($3, phone),
           notifications = COALESCE($4, notifications),
           avatar_url = COALESCE($5, avatar_url)
       WHERE user_id = $6
       RETURNING id, user_id, username, name, email, avatar_url, bio, phone, notifications`,
      [name, bio, phone, notifications, avatar_url, userId]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error in updateProfile:', error);
    res.status(500).json({ error: error.message });
  }
});

// Оценить пользователя
router.post('/rate', authenticate, async (req, res) => {
  const { raterId, ratedUserId, score } = req.body;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Проверка существующей оценки
    const existing = await client.query(
      'SELECT * FROM ratings WHERE rater_id = $1 AND rated_user_id = $2',
      [raterId, ratedUserId]
    );
    
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Already rated' });
    }
    
    // Добавление оценки
    await client.query(
      'INSERT INTO ratings (rater_id, rated_user_id, score) VALUES ($1, $2, $3)',
      [raterId, ratedUserId, score]
    );
    
    // Обновление рейтинга пользователя
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
      [ratedUserId, raterId]
    );
    
    await client.query('COMMIT');
    res.json({ message: 'Rated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in rateUser:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Поиск пользователей
router.get('/search', authenticate, async (req, res) => {
  const { q } = req.query;
  const userId = req.userId;
  
  try {
    const result = await pool.query(
      `SELECT id, user_id, username, name, avatar_url, is_online, last_seen
       FROM profiles 
       WHERE (name ILIKE $1 OR username ILIKE $1)
       AND user_id != $2
       LIMIT 20`,
      [`%${q}%`, userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error in searchUsers:', error);
    res.status(500).json([]);
  }
});

export default router;