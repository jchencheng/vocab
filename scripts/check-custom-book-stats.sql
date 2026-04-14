-- 检查自定义单词书的统计数据
SELECT 
    id,
    name,
    word_count,
    mastered_count,
    learning_count,
    new_count
FROM vocab_app.word_books
WHERE source_type = 'custom';

-- 检查 word_book_items 中自定义单词书的实际数据
SELECT 
    wb.name,
    wb.id,
    COUNT(wbi.id) as actual_count,
    COUNT(CASE WHEN wbi.status = 'mastered' THEN 1 END) as mastered,
    COUNT(CASE WHEN wbi.status = 'learning' THEN 1 END) as learning,
    COUNT(CASE WHEN wbi.status = 'new' OR wbi.status IS NULL THEN 1 END) as new_words
FROM vocab_app.word_books wb
LEFT JOIN vocab_app.word_book_items wbi ON wbi.word_book_id = wb.id
WHERE wb.source_type = 'custom'
GROUP BY wb.id, wb.name;
