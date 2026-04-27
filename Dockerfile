FROM node:18-alpine

WORKDIR /app

# Копируем package.json из папки backend
COPY backend/package*.json ./backend/

# Устанавливаем зависимости
RUN cd backend && npm install

# Копируем весь код backend
COPY backend/ ./backend/

WORKDIR /app/backend

EXPOSE 5000

CMD ["node", "server.js"]