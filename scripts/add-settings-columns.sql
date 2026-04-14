-- 添加缺失的字段到 settings 表
ALTER TABLE vocab_app.settings 
ADD COLUMN IF NOT EXISTS study_mode TEXT DEFAULT 'book-priority',
ADD COLUMN IF NOT EXISTS primary_word_book_id UUID;

-- 显示更新后的表结构
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'vocab_app' 
    AND table_name = 'settings'
ORDER BY ordinal_position;
