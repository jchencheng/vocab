-- 在 user_word_progress 表添加 is_excluded 字段
ALTER TABLE vocab_app.user_word_progress 
ADD COLUMN IF NOT EXISTS is_excluded BOOLEAN DEFAULT false;

-- 创建索引加速查询
CREATE INDEX IF NOT EXISTS idx_user_word_progress_excluded 
ON vocab_app.user_word_progress(user_id, is_excluded);
