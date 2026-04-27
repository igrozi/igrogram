FROM node:18-alpine

WORKDIR /app

# Копируем backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install

COPY backend/ ./backend/

WORKDIR /app/backend

# Явно указываем порт
ENV PORT=5000
EXPOSE 5000

CMD ["node", "server.js"]