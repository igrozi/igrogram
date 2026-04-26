FROM node:latest

WORKDIR /app

# Копируем package.json и package-lock.json из папки backend
COPY backend/package*.json ./backend/

# Устанавливаем зависимости
RUN cd backend && npm ci --only=production

# Копируем весь код backend
COPY backend/ ./backend/

# Устанавливаем рабочую директорию
WORKDIR /app/backend

# Открываем порт
EXPOSE 5000

# Запускаем сервер
CMD ["node", "server.js"]