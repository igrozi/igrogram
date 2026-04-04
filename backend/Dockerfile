FROM node:18-alpine

WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY package*.json ./
RUN npm install --omit=dev

# Копируем остальные файлы
COPY . .

# Создаем директории для загрузок
RUN mkdir -p /app/uploads/avatars /app/uploads/chat-images /app/uploads/posts

EXPOSE 5000

CMD ["node", "server.js"]