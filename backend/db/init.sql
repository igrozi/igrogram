-- Создание таблиц для мессенджера

-- Таблица профилей пользователей
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    bio TEXT DEFAULT '',
    phone VARCHAR(20),
    is_online BOOLEAN DEFAULT false,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notifications BOOLEAN DEFAULT true,
    rating DECIMAL(3,1) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    voted_users TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица сообщений
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id VARCHAR(255) NOT NULL,
    receiver_id VARCHAR(255) NOT NULL,
    body TEXT,
    image_url TEXT,
    is_read BOOLEAN DEFAULT false,
    reply_to UUID,
    reply_to_body TEXT,
    reply_to_sender VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reply_to) REFERENCES messages(id) ON DELETE SET NULL
);

-- Таблица постов
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id VARCHAR(255) NOT NULL,
    author_name VARCHAR(100) NOT NULL,
    author_username VARCHAR(50) NOT NULL,
    author_avatar TEXT,
    content TEXT,
    image_url TEXT,
    likes TEXT[] DEFAULT '{}',
    comments_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT false,
    pinned_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица комментариев
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL,
    author_id VARCHAR(255) NOT NULL,
    author_name VARCHAR(100) NOT NULL,
    author_avatar TEXT,
    content TEXT NOT NULL,
    reply_to UUID,
    reply_to_author VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (reply_to) REFERENCES comments(id) ON DELETE SET NULL
);

-- Таблица оценок пользователей
CREATE TABLE IF NOT EXISTS ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rater_id VARCHAR(255) NOT NULL,
    rated_user_id VARCHAR(255) NOT NULL,
    score INTEGER CHECK (score >= 1 AND score <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(rater_id, rated_user_id)
);

-- Индексы для улучшения производительности
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_rated_user ON ratings(rated_user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_rater_user ON ratings(rater_id);

-- Функция автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления updated_at в таблице profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
