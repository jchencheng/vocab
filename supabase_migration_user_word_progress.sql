-- ============================================
-- 迁移：创建用户单词进度表，实现用户级别复习状态
-- ============================================

-- 1. 创建用户单词进度表
CREATE TABLE IF NOT EXISTS vocab_app.user_word_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    word_id UUID NOT NULL REFERENCES vocab_app.words(id) ON DELETE CASCADE,
    interval INTEGER NOT NULL DEFAULT 0,
    review_count INTEGER NOT NULL DEFAULT 0,
    ease_factor REAL NOT NULL DEFAULT 2.5,
    next_review_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    quality INTEGER NOT NULL DEFAULT 0,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    UNIQUE(user_id, word_id)
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_user_word_progress_user ON vocab_app.user_word_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_word_progress_word ON vocab_app.user_word_progress(word_id);
CREATE INDEX IF NOT EXISTS idx_user_word_progress_next_review ON vocab_app.user_word_progress(user_id, next_review_at);

-- 3. 启用 RLS
ALTER TABLE vocab_app.user_word_progress ENABLE ROW LEVEL SECURITY;

-- 4. 创建访问策略
CREATE POLICY "Allow all on user_word_progress" ON vocab_app.user_word_progress
    FOR ALL USING (true) WITH CHECK (true);

-- 5. 授予权限
GRANT ALL ON vocab_app.user_word_progress TO anon;
GRANT ALL ON vocab_app.user_word_progress TO authenticated;

-- ============================================
-- 使用说明
-- ============================================
-- 1. 在 Supabase Dashboard 的 SQL Editor 中执行此脚本
-- 2. 用户添加单词书时，为每个单词创建进度记录
-- 3. 用户复习时，更新 progress 表而不是 words 表
-- 4. 查询复习队列时，JOIN words 表和 progress 表
-- ============================================
