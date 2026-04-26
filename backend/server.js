import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import messagesRoutes from './routes/messages.js';
import postsRoutes from './routes/posts.js';
import uploadRoutes from './routes/upload.js';
import ratingStatsRouter from './routes/ratingStats.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:3000', 'http://localhost'],
    credentials: true
  }
});

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:3000', 'http://localhost'],
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/ratings', ratingStatsRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.originalUrl}` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Socket.io
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('join', (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
      console.log(`User ${userId} joined room`);
    }
  });

  socket.on('send_message', (data) => {
    if (data.receiver_id) {
      io.to(`user_${data.receiver_id}`).emit('new_message', data);
      io.to(`user_${data.sender_id}`).emit('message_sent', data);
    }
  });

  socket.on('typing', (data) => {
    if (data.receiver_id) {
      socket.to(`user_${data.receiver_id}`).emit('user_typing', {
        sender_id: data.sender_id,
        sender_name: data.sender_name
      });
    }
  });

  socket.on('mark_read', (data) => {
    if (data.sender_id) {
      io.to(`user_${data.sender_id}`).emit('messages_read', {
        receiver_id: data.receiver_id
      });
    }
  });

  socket.on('delete_message', (data) => {
    console.log('Delete message event:', data);
    if (data.chatId) {
      io.to(`user_${data.chatId}`).emit('message_deleted', {
        messageId: data.messageId
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`⚡ Igrogram URL: http://localhost`);
});