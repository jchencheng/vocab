-- =====================================================
-- 安全的数据迁移脚本：将用户添加的单词迁移到"自定义单词书"
-- 运行方式：在 Supabase SQL Editor 中执行
-- 注意事项：
--   1. 此脚本只迁移 user_id 存在于 auth.users 表中的记录
--   2. 孤立的记录（user_id 不在 auth.users 中）将被跳过
--   3. 建议先运行 diagnose-orphaned-users.sql 诊断脚本
-- =====================================================

-- 开始事务
BEGIN;

-- =====================================================
-- 第 1 步：为每个有单词的有效用户创建"自定义单词书"
-- 只处理 user_id 存在于 auth.users 表中的记录
-- =====================================================
INSERT INTO vocab_app.word_books (user_id, name, description, source_type, is_active, created_at, updated_at)
SELECT DISTINCT 
    w.user_id,
    '自定义单词书',
    '用户手动添加的单词集合',
    'custom',
    true,
    EXTRACT(EPOCH FROM NOW())::bigint,
    EXTRACT(EPOCH FROM NOW())::bigint
FROM vocab_app.words w
-- 关键：JOIN auth.users 确保只处理有效用户
JOIN auth.users u ON u.id = w.user_id
WHERE w.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM vocab_app.word_books wb 
    WHERE wb.user_id = w.user_id 
    AND wb.name = '自定义单词书'
    AND wb.source_type = 'custom'
  );

-- 显示创建的单词书数量
SELECT 
    '第 1 步完成' as step,
    COUNT(*) as custom_books_created
FROM vocab_app.word_books 
WHERE name = '自定义单词书' 
  AND source_type = 'custom'
  AND created_at > EXTRACT(EPOCH FROM NOW())::bigint - 60; -- 最近1分钟内创建的

-- =====================================================
-- 第 2 步：将新创建的自定义单词书添加到用户的学习序列
-- =====================================================
INSERT INTO vocab_app.user_learning_sequences (user_id, word_book_id, is_primary, created_at)
SELECT 
    wb.user_id,
    wb.id,
    NOT EXISTS (
        SELECT 1 FROM vocab_app.user_learning_sequences uls 
        WHERE uls.user_id = wb.user_id
    ),
    EXTRACT(EPOCH FROM NOW())::bigint
FROM vocab_app.word_books wb
WHERE wb.name = '自定义单词书'
  AND wb.source_type = 'custom'
  AND NOT EXISTS (
    SELECT 1 FROM vocab_app.user_learning_sequences uls 
    WHERE uls.user_id = wb.user_id 
    AND uls.word_book_id = wb.id
  );

-- 显示添加的学习序列数量
SELECT 
    '第 2 步完成' as step,
    COUNT(*) as sequences_added
FROM vocab_app.user_learning_sequences uls
JOIN vocab_app.word_books wb ON wb.id = uls.word_book_id
WHERE wb.name = '自定义单词书' 
  AND wb.source_type = 'custom'
  AND uls.created_at > EXTRACT(EPOCH FROM NOW())::bigint - 60;

-- =====================================================
-- 第 3 步：将有效用户的单词添加到对应的自定义单词书
-- 只迁移 user_id 存在于 auth.users 表中的单词
-- =====================================================
INSERT INTO vocab_app.word_book_items (word_book_id, word_id, status, source_type, created_at)
SELECT 
    wb.id,
    w.id,
    COALESCE(w.status, 'new'),
    'custom',
    EXTRACT(EPOCH FROM NOW())::bigint
FROM vocab_app.words w
-- 关键：JOIN auth.users 确保只处理有效用户
JOIN auth.users u ON u.id = w.user_id
JOIN vocab_app.word_books wb ON wb.user_id = w.user_id 
    AND wb.name = '自定义单词书' 
    AND wb.source_type = 'custom'
WHERE w.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM vocab_app.word_book_items wbi 
    WHERE wbi.word_book_id = wb.id 
    AND wbi.word_id = w.id
  );

-- 显示迁移的单词数量
SELECT 
    '第 3 步完成' as step,
    COUNT(*) as words_migrated
FROM vocab_app.word_book_items wbi
JOIN vocab_app.word_books wb ON wb.id = wbi.word_book_id
WHERE wb.name = '自定义单词书' 
  AND wb.source_type = 'custom'
  AND wbi.created_at > EXTRACT(EPOCH FROM NOW())::bigint - 60;

-- =====================================================
-- 第 4 步：更新所有自定义单词书的 word_count
-- =====================================================
UPDATE vocab_app.word_books wb
SET word_count = (
    SELECT COUNT(*) 
    FROM vocab_app.word_book_items wbi 
    WHERE wbi.word_book_id = wb.id
)
WHERE wb.source_type = 'custom';

-- 显示更新后的统计
SELECT 
    '第 4 步完成' as step,
    COUNT(*) as books_updated,
    SUM(word_count) as total_words_in_custom_books
FROM vocab_app.word_books 
WHERE source_type = 'custom';

-- =====================================================
-- 第 5 步：显示完整的迁移结果
-- =====================================================
SELECT 
    '迁移完成统计' as info,
    (SELECT COUNT(*) FROM vocab_app.word_books WHERE name = '自定义单词书' AND source_type = 'custom') as total_custom_books,
    (SELECT COUNT(*) FROM vocab_app.user_learning_sequences uls 
     JOIN vocab_app.word_books wb ON wb.id = uls.word_book_id 
     WHERE wb.name = '自定义单词书' AND wb.source_type = 'custom') as total_sequences,
    (SELECT COUNT(*) FROM vocab_app.word_book_items wbi 
     JOIN vocab_app.word_books wb ON wb.id = wbi.word_book_id 
     WHERE wb.name = '自定义单词书' AND wb.source_type = 'custom') as total_migrated_words;

-- =====================================================
-- 第 6 步：显示被跳过的孤立记录统计
-- =====================================================
SELECT 
    '被跳过的孤立记录' as info,
    COUNT(*) as skipped_word_count,
    COUNT(DISTINCT user_id) as skipped_user_count
FROM vocab_app.words w
LEFT JOIN auth.users u ON u.id = w.user_id
WHERE w.user_id IS NOT NULL 
  AND u.id IS NULL;

-- 提交事务
COMMIT;
