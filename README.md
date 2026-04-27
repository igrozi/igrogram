✨ О проекте
IGROGRAM — это полнофункциональный мессенджер, созданный с нуля с использованием современного стека технологий. Проект сочетает в себе элегантный дизайн, высокую производительность и богатый функционал.

🎯 Ключевые особенности
Функция	Описание
💬 Реальное время	Мгновенная доставка сообщений через WebSocket
👤 Профили пользователей	Аватар, биография, личная стена постов
⭐ Система рейтинга	Оценка пользователей по 5-звёздочной шкале
📸 Обмен медиа	Загрузка и отправка изображений
🔔 Статус онлайн	Отслеживание активности пользователей
✅ Прочитанные сообщения	Двойные галочки о прочтении
📌 Закрепление постов	Важные записи всегда наверху
💬 Комментарии	Обсуждение постов с возможностью ответов
🎨 Тёмная тема	Комфортное использование в любое время суток
📱 Адаптивный дизайн	Работает на всех устройствах
🏗️ Архитектура проекта
┌─────────────────────────────────────────────────────────────┐
│                     Клиент (Vercel)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   React     │  │  Tailwind   │  │   Socket.io Client  │  │
│  │   Router    │  │    CSS      │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS / WSS
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Сервер (Railway)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Express    │  │  Socket.io  │  │      JWT Auth       │  │
│  │    API      │  │   Server    │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ PostgreSQL
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   База данных (Railway)                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  profiles │ messages │ posts │ comments │ ratings    │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
🚀 Демо
Живая версия: https://igrogram.vercel.app

⚡ Регистрация займёт 30 секунд — попробуйте все функции!

📦 Технологический стек
Фронтенд
Технология	Версия	Назначение
React	18.2.0	UI библиотека
React Router DOM	6.20.0	Маршрутизация
Vite	5.0.8	Сборщик
TailwindCSS	3.4.0	Стилизация
Framer Motion	10.16.16	Анимации
Socket.io Client	4.5.4	WebSocket
Lucide React	0.303.0	Иконки
Бэкенд
Технология	Версия	Назначение
Node.js	18+	Среда выполнения
Express	4.18.2	Веб-фреймворк
PostgreSQL	15	База данных
Socket.io	4.5.4	WebSocket сервер
JWT	9.0.2	Аутентификация
BcryptJS	2.4.3	Хеширование паролей
Multer	1.4.5-lts.1	Загрузка файлов
🛠️ Установка и запуск
Требования
Node.js 18 или выше

PostgreSQL 15 или выше

npm или yarn

1️⃣ Клонирование репозитория
bash
git clone https://github.com/igrozi/igrogram.git
cd igrogram
2️⃣ Настройка базы данных
bash
# Создайте базу данных PostgreSQL
sudo -u postgres psql
CREATE DATABASE igrogram;
CREATE USER igrogram_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE igrogram TO igrogram_user;
\q
3️⃣ Настройка бэкенда
bash
# Перейдите в папку бэкенда
cd backend

# Установите зависимости
npm install

# Создайте файл .env
cat > .env << EOF
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_USER=igrogram_user
DB_PASSWORD=your_password
DB_NAME=igrogram
JWT_SECRET=generate_a_strong_secret_key_here
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
NODE_ENV=development
EOF

# Запустите сервер
npm start
Бэкенд запустится на http://localhost:5000

4️⃣ Настройка фронтенда
bash
# Откройте новый терминал, перейдите в папку фронтенда
cd frontend

# Установите зависимости
npm install

# Создайте файл .env
cat > .env << EOF
VITE_API_URL=http://localhost:5000
EOF

# Запустите дев-сервер
npm run dev
Фронтенд запустится на http://localhost:5173

5️⃣ Готово!
Откройте браузер по адресу http://localhost:5173 и зарегистрируйтесь.

🚢 Деплой в продакшен
Деплой бэкенда на Railway
Подготовка репозитория

bash
# Убедитесь, что есть railway.json в корне
cat > railway.json << EOF
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
EOF

# Создайте Dockerfile
cat > Dockerfile << EOF
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev
COPY backend/ ./backend/
WORKDIR /app/backend
EXPOSE 5000
CMD ["node", "server.js"]
EOF
Деплой

Зайдите на Railway.app

Создайте новый проект → Deploy from GitHub

Выберите ваш репозиторий

Добавьте PostgreSQL плагин

Добавьте переменные окружения:

Переменная	Значение
JWT_SECRET	(сгенерируйте через openssl rand -hex 32)
CORS_ORIGIN	https://ваш-фронтенд.vercel.app
NODE_ENV	production
Включите WebSocket Proxying в настройках сервиса

Нажмите Deploy

Деплой фронтенда на Vercel
Подготовка

bash
# Создайте vercel.json в папке frontend
cat > frontend/vercel.json << EOF
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
EOF
Деплой

Зайдите на Vercel.com

Нажмите Add New → Project

Импортируйте ваш GitHub репозиторий

В Root Directory укажите frontend

В Environment Variables добавьте:

Переменная	Значение
VITE_API_URL	https://ваш-бэкенд.up.railway.app
Нажмите Deploy

📁 Структура проекта
text
igrogram/
├── backend/                      # Бэкенд на Node.js + Express
│   ├── db/
│   │   ├── init.sql             # SQL схема базы данных
│   │   └── pool.js              # Подключение к PostgreSQL
│   ├── middleware/
│   │   └── auth.js              # JWT аутентификация
│   ├── routes/
│   │   ├── auth.js              # Регистрация, логин, верификация
│   │   ├── users.js             # Профили, поиск, рейтинг
│   │   ├── messages.js          # Чаты, сообщения, прочтения
│   │   ├── posts.js             # Посты, лайки, комментарии
│   │   ├── upload.js            # Загрузка файлов (multer)
│   │   └── ratingStats.js       # Статистика оценок
│   ├── uploads/                 # Загруженные файлы (создаётся автоматически)
│   │   ├── avatars/             # Аватары пользователей
│   │   ├── chat-images/         # Изображения в чатах
│   │   └── posts/               # Изображения в постах
│   ├── server.js                # Точка входа, Socket.IO
│   ├── package.json
│   └── .env
│
├── frontend/                    # Фронтенд на React + Vite
│   ├── public/
│   │   ├── site.webmanifest     # PWA манифест
│   │   └── favicon.ico
│   ├── src/
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # Управление аутентификацией
│   │   ├── pages/
│   │   │   ├── Auth.jsx         # Страница входа/регистрации
│   │   │   ├── Room.jsx         # Главная страница чата
│   │   │   ├── Profile.jsx      # Профиль пользователя
│   │   │   └── Settings.jsx     # Настройки аккаунта
│   │   ├── components/          # Переиспользуемые компоненты
│   │   ├── api.js               # API клиент
│   │   ├── App.jsx              # Корневой компонент
│   │   ├── main.jsx             # Точка входа
│   │   └── index.css            # Глобальные стили + Tailwind
│   ├── index.html
│   ├── vite.config.js
│   ├── vercel.json
│   ├── package.json
│   └── .env
│
├── docker-compose.yml           # Локальный запуск всех сервисов
├── railway.json                 # Конфигурация Railway
├── Dockerfile                   # Для деплоя на Railway
└── README.md                    # Документация
🎮 Функционал
💬 Чаты
Возможность	Описание
Отправка текста	Поддержка многострочных сообщений
Отправка изображений	Загрузка и отображение фотографий
Ответы на сообщения	Цитирование с контекстом
Редактирование	(в разработке)
Удаление	С анимацией "лопающегося пузыря"
Прочитано	Двойные галочки при прочтении
Статус онлайн	Зелёный индикатор у активных пользователей
👤 Профили
Возможность	Описание
Аватар	Загрузка пользовательского фото
Биография	Текст "о себе" до 250 символов
Стена постов	Публикации с изображениями
Лайки	Оценка постов
Комментарии	Обсуждения с вложенными ответами
Закрепление	Важные посты вверху ленты
Рейтинг	Оценка пользователей 1-5 звёзд
Статистика	Распределение оценок в виде диаграммы
⚙️ Настройки
Возможность	Описание
Смена имени	Отображаемое имя в чатах
Смена email	С проверкой уникальности
Смена пароля	С подтверждением старого
Уведомления	Вкл/выкл (клиентская часть)
Тёмная тема	Автоматическое сохранение
Удаление аккаунта	Полное стирание всех данных
🔒 Безопасность
JWT токены для аутентификации

Bcrypt для хеширования паролей

CORS ограничивает источники запросов

Helmet защищает HTTP заголовки

Валидация на всех уровнях приложения

Санитизация пользовательского ввода

SQL инъекции предотвращаются через параметризованные запросы

🚦 API Эндпоинты
Аутентификация
Метод	URL	Описание
POST	/api/auth/register	Регистрация
POST	/api/auth/login	Вход
GET	/api/auth/verify	Проверка токена
POST	/api/auth/logout	Выход
Пользователи
Метод	URL	Описание
GET	/api/users	Список всех пользователей
GET	/api/users/search?q=	Поиск по имени/логину
GET	/api/users/profile/:username	Профиль пользователя
PUT	/api/users/profile	Обновление профиля
PUT	/api/users/change-password	Смена пароля
POST	/api/users/rate	Оценка пользователя
DELETE	/api/users/:userId	Удаление аккаунта
Сообщения
Метод	URL	Описание
GET	/api/messages/:userId	История переписки
POST	/api/messages	Отправка сообщения
PUT	/api/messages/read/:senderId	Отметить прочитанными
DELETE	/api/messages/:messageId	Удаление
GET	/api/messages/chats/list	Список диалогов
Посты
Метод	URL	Описание
GET	/api/posts/user/:userId	Посты пользователя
POST	/api/posts	Создание поста
PUT	/api/posts/:postId	Обновление поста
DELETE	/api/posts/:postId	Удаление поста
POST	/api/posts/:postId/like	Лайк/анлайк
POST	/api/posts/:postId/comments	Добавить комментарий
DELETE	/api/posts/comments/:commentId	Удалить комментарий
Загрузка файлов
Метод	URL	Описание
POST	/api/upload?type=	Загрузка файла (type: avatar/chat/post)
📊 База данных (схема)
Таблица profiles
sql
- id            UUID (PK)
- user_id       TEXT (UNIQUE)
- username      TEXT (UNIQUE)
- name          TEXT
- email         TEXT (UNIQUE)
- password_hash TEXT
- avatar_url    TEXT
- bio           TEXT
- phone         TEXT
- is_online     BOOLEAN
- last_seen     TIMESTAMP
- notifications BOOLEAN
- rating        DECIMAL(3,1)
- rating_count  INTEGER
- voted_users   TEXT[]
- created_at    TIMESTAMP
Таблица messages
sql
- id            UUID (PK)
- sender_id     TEXT
- receiver_id   TEXT
- body          TEXT
- image_url     TEXT
- is_read       BOOLEAN
- reply_to      UUID
- reply_to_body TEXT
- reply_to_sender TEXT
- created_at    TIMESTAMP
Таблица posts
sql
- id            UUID (PK)
- author_id     TEXT
- author_name   TEXT
- author_username TEXT
- author_avatar TEXT
- content       TEXT
- image_url     TEXT
- likes         TEXT[]
- comments_count INTEGER
- is_pinned     BOOLEAN
- pinned_at     TIMESTAMP
- created_at    TIMESTAMP
Таблица comments
sql
- id            UUID (PK)
- post_id       UUID
- author_id     TEXT
- author_name   TEXT
- author_avatar TEXT
- content       TEXT
- reply_to      UUID
- reply_to_author TEXT
- created_at    TIMESTAMP
Таблица ratings
sql
- id            UUID (PK)
- rater_id      TEXT
- rated_user_id TEXT
- score         INTEGER (1-5)
- created_at    TIMESTAMP
- UNIQUE(rater_id, rated_user_id)
🧪 Тестирование
bash
# Запуск бэкенда в тестовом режиме
cd backend
npm run test  # (есть в планах)

# Запуск фронтенда с линтером
cd frontend
npm run lint  # (есть в планах)
🔧 Устранение неполадок
CORS ошибка
text
Access to fetch has been blocked by CORS policy
Решение: Проверьте CORS_ORIGIN в .env бэкенда. Добавьте домен фронтенда в список разрешённых.

WebSocket не подключается
text
WebSocket connection failed
Решение: На Railway включите WebSocket Proxying в настройках сервиса. На Vercel проверьте переменную VITE_API_URL.

Не загружаются изображения
text
Mixed Content: page was loaded over HTTPS, but requested an insecure element
Решение: В upload.js принудительно используйте https для продакшена. Установите NODE_ENV=production.

502 Bad Gateway
text
POST /api/upload 502
Решение: Папки uploads/ не созданы. Убедитесь, что сервер имеет права на запись, или создайте папки вручную.

База данных не инициализируется
text
⚠️ DB init warning: relation "profiles" does not exist
Решение: Запустите SQL скрипт вручную через Railway Console или выполните init.sql в вашем клиенте PostgreSQL.
