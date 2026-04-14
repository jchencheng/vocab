-- 直接查询 API 应该返回的数据
-- 1. 系统单词书
SELECT id, name, word_count
FROM vocab_app.word_books
WHERE source_type = 'system' AND is_active = true;

-- 2. word_book_items 统计
SELECT 
    wb.id,
    wb.name,
    COUNT(wbi.id) as total,
    COUNT(CASE WHEN wbi.status = 'mastered' THEN 1 END) as mastered,
    COUNT(CASE WHEN wbi.status = 'learning' THEN 1 END) as learning,
    COUNT(CASE WHEN wbi.status = 'ignored' THEN 1 END) as ignored,
    COUNT(CASE WHEN wbi.status = 'new' OR wbi.status IS NULL THEN 1 END) as new_words
FROM vocab_app.word_books wb
LEFT JOIN vocab_app.word_book_items wbi ON wbi.word_book_id = wb.id
WHERE wb.source_type = 'system'
GROUP BY wb.id, wb.name;
