-- 检查 words 表结构
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'vocab_app' 
    AND table_name = 'words'
ORDER BY ordinal_position;
