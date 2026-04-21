import express from 'express';
import { pool } from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Получить статистику оценок пользователя
router.get('/stats/:userId', authenticate, async (req, res) => {
  const { userId } = req.params;
  
  try {
    // Получаем распределение оценок
    const distributionResult = await pool.query(
      `SELECT 
        score,
        COUNT(*) as count
       FROM ratings
       WHERE rated_user_id = $1
       GROUP BY score
       ORDER BY score DESC`,
      [userId]
    );
    
    // Получаем общую статистику
    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COALESCE(AVG(score)::DECIMAL(3,1), 0) as average
       FROM ratings
       WHERE rated_user_id = $1`,
      [userId]
    );
    
    // Формируем объект с распределением
    const stats = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
    distributionResult.rows.forEach(row => {
      stats[row.score] = parseInt(row.count);
    });
    
    res.json({
      stats,
      total: parseInt(statsResult.rows[0].total),
      average: parseFloat(statsResult.rows[0].average)
    });
  } catch (error) {
    console.error('Error in getRatingStats:', error);
    res.status(500).json({ 
      stats: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}, 
      total: 0, 
      average: 0 
    });
  }
});

// Получить список проголосовавших с их оценками
router.get('/voters/:userId', authenticate, async (req, res) => {
  const { userId } = req.params;
  
  try {
    const result = await pool.query(
      `SELECT 
        r.score,
        r.created_at,
        p.user_id,
        p.name,
        p.username,
        p.avatar_url
       FROM ratings r
       JOIN profiles p ON r.rater_id = p.user_id
       WHERE r.rated_user_id = $1
       ORDER BY r.created_at DESC
       LIMIT 50`,
      [userId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error in getVoters:', error);
    res.status(500).json([]);
  }
});

export default router;