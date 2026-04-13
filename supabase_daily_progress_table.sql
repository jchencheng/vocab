-- ============================================
-- 用户每日复习进度表
-- 用于记录用户当天的复习进度，确保一天内只复习最大数量单词
-- ============================================

-- 创建每日复习进度表
CREATE TABLE IF NOT EXISTS vocab_app.user_daily_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES vocab_app.users(id) ON DELETE CASCADE,
    review_date DATE NOT NULL,  -- 复习日期 (YYYY-MM-DD)
    queue_word_ids UUID[] DEFAULT '{}'::uuid[],  -- 当日复习队列单词ID列表（有序）
    current_index INTEGER DEFAULT 0,  -- 当前复习到的位置
    completed_word_ids UUID[] DEFAULT '{}'::uuid[],  -- 已完成复习的单词ID列表
    postponed_word_ids UUID[] DEFAULT '{}'::uuid[],  -- 推迟到明天的单词ID列表
    max_daily_reviews INTEGER NOT NULL DEFAULT 50,  -- 当日最大复习数量
    is_completed BOOLEAN DEFAULT false,  -- 是否已完成当日复习
    created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    updated_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    UNIQUE(user_id, review_date)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_daily_progress_user_date ON vocab_app.user_daily_progress(user_id, review_date);
CREATE INDEX IF NOT EXISTS idx_daily_progress_user_id ON vocab_app.user_daily_progress(user_id);

-- 启用 RLS
ALTER TABLE vocab_app.user_daily_progress ENABLE ROW LEVEL SECURITY;

-- 策略
CREATE POLICY "Allow all on user_daily_progress" ON vocab_app.user_daily_progress
    FOR ALL USING (true) WITH CHECK (true);

-- 授予权限
GRANT ALL ON vocab_app.user_daily_progress TO anon;
GRANT ALL ON vocab_app.user_daily_progress TO authenticated;

-- 添加注释
COMMENT ON TABLE vocab_app.user_daily_progress IS '记录用户每日复习进度';
COMMENT ON COLUMN vocab_app.user_daily_progress.queue_word_ids IS '当日复习队列单词ID列表（按复习顺序）';
COMMENT ON COLUMN vocab_app.user_daily_progress.current_index IS '当前复习到的位置（数组索引）';
COMMENT ON COLUMN vocab_app.user_daily_progress.completed_word_ids IS '已完成复习的单词ID列表';
COMMENT ON COLUMN vocab_app.user_daily_progress.postponed_word_ids IS '推迟到明天的单词ID列表';
