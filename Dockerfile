FROM node:18-alpine

WORKDIR /app

# Копируем backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install

COPY backend/ ./backend/

WORKDIR /app/backend

EXPOSE 5000

CMD ["node", "server.js"]