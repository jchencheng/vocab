-- 检查迁移结果
-- 1. 检查所有单词书的 source_type 分布
SELECT 
    source_type,
    COUNT(*) as count
FROM vocab_app.word_books
GROUP BY source_type;

-- 2. 检查名为"自定义单词书"的单词书
SELECT 
    id,
    name,
    user_id,
    source_type,
    word_count,
    created_at
FROM vocab_app.word_books 
WHERE name = '自定义单词书';

-- 3. 检查 word_book_items 表的数据
SELECT 
    wb.name as book_name,
    wb.source_type,
    COUNT(wbi.id) as item_count
FROM vocab_app.word_books wb
LEFT JOIN vocab_app.word_book_items wbi ON wbi.word_book_id = wb.id
GROUP BY wb.id, wb.name, wb.source_type
ORDER BY item_count DESC;

-- 4. 检查 words 表中用户添加的单词
SELECT 
    source,
    COUNT(*) as count
FROM vocab_app.words
WHERE user_id IS NOT NULL
GROUP BY source;

-- 5. 检查是否有用户添加了单词但没有创建自定义单词书
SELECT 
    w.user_id,
    COUNT(*) as word_count,
    EXISTS (
        SELECT 1 FROM vocab_app.word_books wb 
        WHERE wb.user_id = w.user_id AND wb.name = '自定义单词书'
    ) as has_custom_book
FROM vocab_app.words w
WHERE w.user_id IS NOT NULL
GROUP BY w.user_id;
