-- ============================================
-- Vocab App - 完全独立（应用级别隔离）方案
-- 每个应用有自己的用户表，完全隔离
-- ============================================

-- 创建 Schema
CREATE SCHEMA IF NOT EXISTS vocab_app;

-- ============================================
-- 1. 用户表 (独立认证)
-- ============================================
CREATE TABLE IF NOT EXISTS vocab_app.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_email ON vocab_app.users(email);

-- ============================================
-- 2. 单词表
-- ============================================
CREATE TABLE IF NOT EXISTS vocab_app.words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES vocab_app.users(id) ON DELETE CASCADE,
    word TEXT NOT NULL,
    phonetic TEXT,
    phonetics JSONB DEFAULT '[]'::jsonb,
    meanings JSONB NOT NULL DEFAULT '[]'::jsonb,
    tags TEXT[] DEFAULT '{}'::text[],
    custom_note TEXT,
    interval INTEGER NOT NULL DEFAULT 1,
    ease_factor REAL NOT NULL DEFAULT 2.5,
    review_count INTEGER NOT NULL DEFAULT 0,
    next_review_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    quality INTEGER NOT NULL DEFAULT 0
);

-- 单词表索引
CREATE INDEX IF NOT EXISTS idx_words_user_id ON vocab_app.words(user_id);
CREATE INDEX IF NOT EXISTS idx_words_next_review ON vocab_app.words(user_id, next_review_at);

-- ============================================
-- 3. 语境表
-- ============================================
CREATE TABLE IF NOT EXISTS vocab_app.contexts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES vocab_app.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    word_ids UUID[] DEFAULT '{}'::uuid[],
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- 语境表索引
CREATE INDEX IF NOT EXISTS idx_contexts_user_id ON vocab_app.contexts(user_id);

-- ============================================
-- 4. 设置表
-- ============================================
CREATE TABLE IF NOT EXISTS vocab_app.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES vocab_app.users(id) ON DELETE CASCADE UNIQUE,
    max_daily_reviews INTEGER NOT NULL DEFAULT 50,
    dark_mode BOOLEAN NOT NULL DEFAULT false,
    updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- 设置表索引
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON vocab_app.settings(user_id);

-- ============================================
-- 5. 行级安全策略 (RLS)
-- ============================================

-- 启用 RLS
ALTER TABLE vocab_app.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_app.words ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_app.contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_app.settings ENABLE ROW LEVEL SECURITY;

-- 注意：由于使用独立用户认证系统，不使用 Supabase Auth
-- 这里创建宽松的策略，让应用层控制访问权限
-- 实际应用中，可以通过 Postgres 函数或应用层验证用户身份

-- 用户表策略：允许所有操作（应用层控制）
CREATE POLICY "Allow all on users" ON vocab_app.users
    FOR ALL USING (true) WITH CHECK (true);

-- 单词表策略：允许所有操作（应用层控制）
CREATE POLICY "Allow all on words" ON vocab_app.words
    FOR ALL USING (true) WITH CHECK (true);

-- 语境表策略：允许所有操作（应用层控制）
CREATE POLICY "Allow all on contexts" ON vocab_app.contexts
    FOR ALL USING (true) WITH CHECK (true);

-- 设置表策略：允许所有操作（应用层控制）
CREATE POLICY "Allow all on settings" ON vocab_app.settings
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 6. 权限设置
-- ============================================

-- 授予 anon 角色访问权限（使用 publishable key 访问）
GRANT USAGE ON SCHEMA vocab_app TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA vocab_app TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA vocab_app TO anon;

-- 授予 authenticated 角色访问权限
GRANT USAGE ON SCHEMA vocab_app TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA vocab_app TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA vocab_app TO authenticated;

-- ============================================
-- 使用说明
-- ============================================
-- 1. 在 Supabase Dashboard 的 SQL Editor 中执行此脚本
-- 2. 每个应用（vocab_app, todo_app 等）都有自己的用户表
-- 3. 用户需要在每个应用中单独注册
-- 4. 数据完全隔离，安全性由应用层控制
-- ============================================
