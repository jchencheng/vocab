-- =====================================================
-- 数据迁移脚本：将用户添加的单词迁移到"自定义单词书"
-- 运行方式：在 Supabase SQL Editor 中执行
-- =====================================================

-- 1. 为每个有单词的有效用户创建"自定义单词书"（如果不存在）
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
JOIN auth.users u ON u.id = w.user_id
WHERE w.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM vocab_app.word_books wb 
    WHERE wb.user_id = w.user_id 
    AND wb.name = '自定义单词书'
    AND wb.source_type = 'custom'
  );

-- 2. 将新创建的自定义单词书添加到用户的学习序列
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

-- 3. 将有效用户的单词添加到对应的自定义单词书
INSERT INTO vocab_app.word_book_items (word_book_id, word_id, status, source_type, created_at)
SELECT 
    wb.id,
    w.id,
    COALESCE(w.status, 'new'),
    'custom',
    EXTRACT(EPOCH FROM NOW())::bigint
FROM vocab_app.words w
JOIN auth.users u ON u.id = w.user_id
JOIN vocab_app.word_books wb ON wb.user_id = w.user_id AND wb.name = '自定义单词书' AND wb.source_type = 'custom'
WHERE w.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM vocab_app.word_book_items wbi 
    WHERE wbi.word_book_id = wb.id 
    AND wbi.word_id = w.id
  );

-- 4. 更新单词书的 word_count
UPDATE vocab_app.word_books wb
SET word_count = (
    SELECT COUNT(*) 
    FROM vocab_app.word_book_items wbi 
    WHERE wbi.word_book_id = wb.id
)
WHERE wb.source_type = 'custom';

-- 5. 显示迁移结果
SELECT 
    '迁移完成统计' as info,
    (SELECT COUNT(*) FROM vocab_app.word_books WHERE name = '自定义单词书' AND source_type = 'custom') as custom_books_created,
    (SELECT COUNT(*) FROM vocab_app.user_learning_sequences uls 
     JOIN vocab_app.word_books wb ON wb.id = uls.word_book_id 
     WHERE wb.name = '自定义单词书' AND wb.source_type = 'custom') as sequences_added,
    (SELECT COUNT(*) FROM vocab_app.word_book_items wbi 
     JOIN vocab_app.word_books wb ON wb.id = wbi.word_book_id 
     WHERE wb.name = '自定义单词书' AND wb.source_type = 'custom') as words_migrated;
