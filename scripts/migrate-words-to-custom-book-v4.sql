-- =====================================================
-- 安全的数据迁移脚本 V4：将用户添加的单词迁移到"自定义单词书"
-- 运行方式：在 Supabase SQL Editor 中执行
-- 修复：使用 INNER JOIN 替代 EXISTS，确保严格过滤
-- =====================================================

-- 开始事务
BEGIN;

-- =====================================================
-- 第 0 步：创建临时表存储有效用户ID
-- 使用 INNER JOIN 确保只获取 auth.users 中存在的用户
-- =====================================================
CREATE TEMP TABLE temp_valid_users AS
SELECT DISTINCT w.user_id
FROM vocab_app.words w
INNER JOIN auth.users u ON u.id = w.user_id
WHERE w.user_id IS NOT NULL;

-- 显示有效用户数量和具体ID（用于调试）
SELECT 
    '第 0 步：有效用户统计' as step,
    COUNT(*) as valid_user_count
FROM temp_valid_users;

-- 调试：显示所有有效用户ID
-- SELECT '有效用户ID列表' as info, user_id FROM temp_valid_users;

-- =====================================================
-- 第 1 步：为每个有效用户创建"自定义单词书"
-- 严格使用临时表中的用户ID
-- =====================================================
INSERT INTO vocab_app.word_books (user_id, name, description, source_type, is_active, created_at, updated_at)
SELECT 
    v.user_id,
    '自定义单词书',
    '用户手动添加的单词集合',
    'custom',
    true,
    EXTRACT(EPOCH FROM NOW())::bigint,
    EXTRACT(EPOCH FROM NOW())::bigint
FROM temp_valid_users v
WHERE NOT EXISTS (
    SELECT 1 FROM vocab_app.word_books wb 
    WHERE wb.user_id = v.user_id 
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
  AND created_at > EXTRACT(EPOCH FROM NOW())::bigint - 60;

-- =====================================================
-- 第 2 步：将新创建的自定义单词书添加到用户的学习序列
-- 只处理临时表中的有效用户
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
INNER JOIN temp_valid_users v ON v.user_id = wb.user_id
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
-- =====================================================
INSERT INTO vocab_app.word_book_items (word_book_id, word_id, status, source_type, created_at)
SELECT 
    wb.id,
    w.id,
    COALESCE(w.status, 'new'),
    'custom',
    EXTRACT(EPOCH FROM NOW())::bigint
FROM vocab_app.words w
INNER JOIN temp_valid_users v ON v.user_id = w.user_id
INNER JOIN vocab_app.word_books wb ON wb.user_id = w.user_id 
    AND wb.name = '自定义单词书' 
    AND wb.source_type = 'custom'
WHERE NOT EXISTS (
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
    COUNT(DISTINCT w.user_id) as skipped_user_count
FROM vocab_app.words w
WHERE w.user_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM temp_valid_users v WHERE v.user_id = w.user_id);

-- 清理临时表
DROP TABLE temp_valid_users;

-- 提交事务
COMMIT;
