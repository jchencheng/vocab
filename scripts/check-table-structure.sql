-- 检查 user_learning_sequences 表结构
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'vocab_app' 
    AND table_name = 'user_learning_sequences'
ORDER BY ordinal_position;

-- 检查 word_book_items 表结构
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'vocab_app' 
    AND table_name = 'word_book_items'
ORDER BY ordinal_position;
