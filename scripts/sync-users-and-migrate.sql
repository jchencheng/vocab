-- =====================================================
-- 同步用户并迁移单词到自定义单词书
-- =====================================================

-- 第 1 步：将 auth.users 中的用户同步到 vocab_app.users
INSERT INTO vocab_app.users (id, email, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    EXTRACT(EPOCH FROM au.created_at)::bigint,
    EXTRACT(EPOCH FROM au.updated_at)::bigint
FROM auth.users au
LEFT JOIN vocab_app.users vu ON vu.id = au.id
WHERE vu.id IS NULL;

-- 显示同步的用户数量
SELECT 
    '同步用户数量' as info,
    COUNT(*) as synced_users
FROM vocab_app.users;

-- 第 2 步：创建临时表存储有效用户ID（现在 vocab_app.users 中应该有了）
CREATE TEMP TABLE temp_valid_users AS
SELECT DISTINCT w.user_id
FROM vocab_app.words w
INNER JOIN vocab_app.users u ON u.id = w.user_id
WHERE w.user_id IS NOT NULL;

-- 显示有效用户数量
SELECT 
    '有效用户数量' as info,
    COUNT(*) as valid_user_count
FROM temp_valid_users;

-- 第 3 步：为每个有效用户创建"自定义单词书"
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
    '创建的自定义单词书数量' as info,
    COUNT(*) as custom_books_created
FROM vocab_app.word_books 
WHERE name = '自定义单词书' 
  AND source_type = 'custom'
  AND created_at > EXTRACT(EPOCH FROM NOW())::bigint - 60;

-- 第 4 步：将新创建的自定义单词书添加到用户的学习序列
INSERT INTO vocab_app.user_learning_sequences (user_id, word_book_id, is_primary)
SELECT 
    wb.user_id,
    wb.id,
    NOT EXISTS (
        SELECT 1 FROM vocab_app.user_learning_sequences uls 
        WHERE uls.user_id = wb.user_id
    )
FROM vocab_app.word_books wb
INNER JOIN temp_valid_users v ON v.user_id = wb.user_id
WHERE wb.name = '自定义单词书'
  AND wb.source_type = 'custom'
  AND NOT EXISTS (
    SELECT 1 FROM vocab_app.user_learning_sequences uls 
    WHERE uls.user_id = wb.user_id 
    AND uls.word_book_id = wb.id
  );

-- 第 5 步：将有效用户的单词添加到对应的自定义单词书
INSERT INTO vocab_app.word_book_items (word_book_id, word_id, status, source_type, added_at)
SELECT 
    wb.id,
    w.id,
    'new',
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
    '迁移的单词数量' as info,
    COUNT(*) as words_migrated
FROM vocab_app.word_book_items wbi
JOIN vocab_app.word_books wb ON wb.id = wbi.word_book_id
WHERE wb.name = '自定义单词书' 
  AND wb.source_type = 'custom'
  AND wbi.added_at > EXTRACT(EPOCH FROM NOW())::bigint - 60;

-- 第 6 步：更新所有自定义单词书的 word_count
UPDATE vocab_app.word_books wb
SET word_count = (
    SELECT COUNT(*) 
    FROM vocab_app.word_book_items wbi 
    WHERE wbi.word_book_id = wb.id
)
WHERE wb.source_type = 'custom';

-- 第 7 步：显示最终结果
SELECT 
    '迁移完成统计' as info,
    (SELECT COUNT(*) FROM vocab_app.word_books WHERE name = '自定义单词书' AND source_type = 'custom') as total_custom_books,
    (SELECT COUNT(*) FROM vocab_app.user_learning_sequences uls 
     JOIN vocab_app.word_books wb ON wb.id = uls.word_book_id 
     WHERE wb.name = '自定义单词书' AND wb.source_type = 'custom') as total_sequences,
    (SELECT COUNT(*) FROM vocab_app.word_book_items wbi 
     JOIN vocab_app.word_books wb ON wb.id = wbi.word_book_id 
     WHERE wb.name = '自定义单词书' AND wb.source_type = 'custom') as total_migrated_words;

-- 清理临时表
DROP TABLE temp_valid_users;
