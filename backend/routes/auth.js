import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';

const router = express.Router();

// ===== ЛОГИРОВАНИЕ ВСЕХ ЗАПРОСОВ =====
router.use((req, res, next) => {
  console.log(`[AUTH] ${req.method} ${req.url}`, req.body);
  next();
});

// ===== РЕГИСТРАЦИЯ =====
router.post('/register', async (req, res) => {
  console.log('📝 REGISTRATION START');
  console.log('📝 Request body:', req.body);
  
  const { email, password, name, username } = req.body;

  // Проверяем, что все поля есть
  if (!email || !password || !name || !username) {
    console.log('❌ Missing fields:', { email: !!email, password: !!password, name: !!name, username: !!username });
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Проверяем, существует ли пользователь
    const existingUser = await pool.query(
      'SELECT * FROM profiles WHERE email = $1 OR username = $2',
      [email, username.toLowerCase()]
    );
    
    if (existingUser.rows.length > 0) {
      console.log('❌ User already exists');
      return res.status(400).json({ message: 'User already exists' });
    }

    // Хешируем пароль
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4f46e5&color=fff&size=512`;

    // Создаём пользователя
    const result = await pool.query(
      `INSERT INTO profiles (user_id, username, name, email, password_hash, avatar_url, is_online)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id, user_id, username, name, email, avatar_url`,
      [userId, username.toLowerCase(), name, email, passwordHash, avatarUrl]
    );

    // Создаём токен
    const token = jwt.sign(
      { userId: result.rows[0].user_id, email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ User registered:', username);
    res.status(201).json({
      user: result.rows[0],
      token
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===== ЛОГИН =====
router.post('/login', async (req, res) => {
  console.log('📝 LOGIN request:', req.body);
  
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM profiles WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    await pool.query(
      'UPDATE profiles SET is_online = true, last_seen = NOW() WHERE id = $1',
      [user.id]
    );

    const token = jwt.sign(
      { userId: user.user_id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password_hash, ...userWithoutPassword } = user;
    console.log('✅ User logged in:', user.username);
    res.json({
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===== ПРОВЕРКА ТОКЕНА =====
router.get('/verify', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query(
      'SELECT id, user_id, username, name, email, avatar_url FROM profiles WHERE user_id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// ===== ЛОГАУТ =====
router.post('/logout', async (req, res) => {
  const { userId } = req.body;
  
  try {
    await pool.query(
      'UPDATE profiles SET is_online = false, last_seen = NOW() WHERE user_id = $1',
      [userId]
    );
    res.json({ message: 'Logged out' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;