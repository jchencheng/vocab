-- 检查 word_books 表的外键约束
SELECT
    tc.constraint_name,
    tc.table_schema,
    tc.table_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'word_books'
    AND tc.table_schema = 'vocab_app';

-- 检查 auth.users 表结构
SELECT 
    'auth.users 列信息' as info,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'auth' 
    AND table_name = 'users';

-- 检查是否存在 public.users 表
SELECT 
    'public schema 中的 users 表' as info,
    table_name
FROM information_schema.tables
WHERE table_schema = 'public' 
    AND table_name = 'users';

-- 检查 vocab_app schema 中是否有 users 表
SELECT 
    'vocab_app schema 中的 users 表' as info,
    table_name
FROM information_schema.tables
WHERE table_schema = 'vocab_app' 
    AND table_name = 'users';
