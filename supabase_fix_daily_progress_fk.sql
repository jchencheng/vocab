-- ============================================
-- 修复 user_daily_progress 表的外键约束
-- 移除外键约束，允许直接使用 auth.users 的 ID
-- ============================================

-- 删除旧表（如果存在）
DROP TABLE IF EXISTS vocab_app.user_daily_progress;

-- 创建简化的每日复习进度表（无外键约束）
CREATE TABLE IF NOT EXISTS vocab_app.user_daily_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,  -- 移除外键约束，直接使用 auth 用户 ID
    review_date DATE NOT NULL,
    current_index INTEGER DEFAULT 0,
    max_daily_reviews INTEGER NOT NULL DEFAULT 50,
    created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    updated_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    UNIQUE(user_id, review_date)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_daily_progress_user_date ON vocab_app.user_daily_progress(user_id, review_date);

-- 启用 RLS
ALTER TABLE vocab_app.user_daily_progress ENABLE ROW LEVEL SECURITY;

-- 策略 - 允许所有操作（与项目其他表保持一致）
CREATE POLICY "Allow all on user_daily_progress" ON vocab_app.user_daily_progress
    FOR ALL USING (true) WITH CHECK (true);

-- 授予权限
GRANT ALL ON vocab_app.user_daily_progress TO anon;
GRANT ALL ON vocab_app.user_daily_progress TO authenticated;

-- 添加注释
COMMENT ON TABLE vocab_app.user_daily_progress IS '每日复习进度表，user_id 对应 auth.users';
