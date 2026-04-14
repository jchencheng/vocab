-- 检查自定义单词书的数据
-- 1. 检查有多少自定义单词书
SELECT 
    '自定义单词书数量' as info,
    COUNT(*) as count
FROM vocab_app.word_books 
WHERE source_type = 'custom';

-- 2. 检查自定义单词书的详细信息
SELECT 
    id,
    name,
    user_id,
    source_type,
    word_count,
    created_at
FROM vocab_app.word_books 
WHERE source_type = 'custom'
ORDER BY created_at DESC;

-- 3. 检查 word_book_items 中有多少单词关联到自定义单词书
SELECT 
    '自定义单词书中的单词数量' as info,
    COUNT(*) as word_count,
    COUNT(DISTINCT word_book_id) as book_count
FROM vocab_app.word_book_items wbi
JOIN vocab_app.word_books wb ON wb.id = wbi.word_book_id
WHERE wb.source_type = 'custom';

-- 4. 检查每个自定义单词书的单词数量
SELECT 
    wb.id as book_id,
    wb.name,
    COUNT(wbi.id) as actual_word_count
FROM vocab_app.word_books wb
LEFT JOIN vocab_app.word_book_items wbi ON wbi.word_book_id = wb.id
WHERE wb.source_type = 'custom'
GROUP BY wb.id, wb.name;

-- 5. 检查 source_type 的所有不同值
SELECT DISTINCT source_type FROM vocab_app.word_books;
