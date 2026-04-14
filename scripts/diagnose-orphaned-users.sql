-- =====================================================
-- 诊断脚本：调查 words 表中的孤立用户记录
-- 目的：找出 user_id 不在 auth.users 表中的记录
-- =====================================================

-- 1. 统计 words 表中不同 user_id 的数量
SELECT 
    'words 表中的 user_id 统计' as check_item,
    COUNT(DISTINCT user_id) as unique_user_count,
    COUNT(*) as total_word_count
FROM vocab_app.words
WHERE user_id IS NOT NULL;

-- 2. 统计 auth.users 表中的用户数量
SELECT 
    'auth.users 表中的用户数量' as check_item,
    COUNT(*) as total_user_count
FROM auth.users;

-- 3. 找出 words 表中存在但 auth.users 中不存在的 user_id（孤立记录）
SELECT 
    '孤立用户记录' as check_item,
    w.user_id as orphaned_user_id,
    COUNT(*) as word_count
FROM vocab_app.words w
LEFT JOIN auth.users u ON u.id = w.user_id
WHERE w.user_id IS NOT NULL 
  AND u.id IS NULL
GROUP BY w.user_id
ORDER BY word_count DESC;

-- 4. 统计孤立记录的总数
SELECT 
    '孤立记录总数' as check_item,
    COUNT(*) as orphaned_word_count,
    COUNT(DISTINCT user_id) as orphaned_user_count
FROM vocab_app.words w
LEFT JOIN auth.users u ON u.id = w.user_id
WHERE w.user_id IS NOT NULL 
  AND u.id IS NULL;

-- 5. 显示部分孤立记录的详细信息（前10条）
SELECT 
    w.id as word_id,
    w.word,
    w.user_id,
    w.created_at,
    w.source
FROM vocab_app.words w
LEFT JOIN auth.users u ON u.id = w.user_id
WHERE w.user_id IS NOT NULL 
  AND u.id IS NULL
ORDER BY w.created_at DESC
LIMIT 10;

-- 6. 统计有效的可迁移记录（user_id 存在于 auth.users 中）
SELECT 
    '可迁移的有效记录' as check_item,
    COUNT(*) as migratable_word_count,
    COUNT(DISTINCT w.user_id) as migratable_user_count
FROM vocab_app.words w
JOIN auth.users u ON u.id = w.user_id
WHERE w.user_id IS NOT NULL;

-- 7. 检查这些孤立 user_id 是否在其他表中也存在
SELECT 
    '孤立 user_id 在其他表中的分布' as check_item,
    'user_learning_sequences' as table_name,
    COUNT(*) as record_count
FROM vocab_app.user_learning_sequences uls
WHERE uls.user_id IN (
    SELECT w.user_id 
    FROM vocab_app.words w
    LEFT JOIN auth.users u ON u.id = w.user_id
    WHERE w.user_id IS NOT NULL AND u.id IS NULL
)
UNION ALL
SELECT 
    '孤立 user_id 在其他表中的分布' as check_item,
    'word_books' as table_name,
    COUNT(*) as record_count
FROM vocab_app.word_books wb
WHERE wb.user_id IN (
    SELECT w.user_id 
    FROM vocab_app.words w
    LEFT JOIN auth.users u ON u.id = w.user_id
    WHERE w.user_id IS NOT NULL AND u.id IS NULL
)
UNION ALL
SELECT 
    '孤立 user_id 在其他表中的分布' as check_item,
    'user_word_progress' as table_name,
    COUNT(*) as record_count
FROM vocab_app.user_word_progress uwp
WHERE uwp.user_id IN (
    SELECT w.user_id 
    FROM vocab_app.words w
    LEFT JOIN auth.users u ON u.id = w.user_id
    WHERE w.user_id IS NOT NULL AND u.id IS NULL
);
