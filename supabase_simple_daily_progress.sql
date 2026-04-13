-- ============================================
-- 简化的每日复习进度表
-- 只存储当前复习位置，队列顺序由算法决定
-- ============================================

-- 删除旧表（如果存在）
DROP TABLE IF EXISTS vocab_app.user_daily_progress;

-- 创建简化的每日复习进度表
CREATE TABLE IF NOT EXISTS vocab_app.user_daily_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES vocab_app.users(id) ON DELETE CASCADE,
    review_date DATE NOT NULL,
    current_index INTEGER DEFAULT 0,  -- 只记录当前复习位置
    max_daily_reviews INTEGER NOT NULL DEFAULT 50,
    created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    updated_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    UNIQUE(user_id, review_date)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_daily_progress_user_date ON vocab_app.user_daily_progress(user_id, review_date);

-- 启用 RLS
ALTER TABLE vocab_app.user_daily_progress ENABLE ROW LEVEL SECURITY;

-- 策略
CREATE POLICY "Allow all on user_daily_progress" ON vocab_app.user_daily_progress
    FOR ALL USING (true) WITH CHECK (true);

-- 授予权限
GRANT ALL ON vocab_app.user_daily_progress TO anon;
GRANT ALL ON vocab_app.user_daily_progress TO authenticated;

-- 添加注释
COMMENT ON TABLE vocab_app.user_daily_progress IS '简化的每日复习进度表，只存储当前位置';
