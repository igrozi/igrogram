FROM node:18-alpine

WORKDIR /app

# Копируем package.json (и, если есть, package-lock.json)
COPY backend/package*.json ./backend/

# Устанавливаем зависимости (не требует lock-файл)
RUN cd backend && npm install --omit=dev

# Копируем весь код backend поверх
COPY backend/ ./backend/

WORKDIR /app/backend

EXPOSE 5000

CMD ["node", "server.js"]