-- 验证所有单词书的统计
-- 1. 检查所有单词书的数量统计
SELECT 
    wb.id,
    wb.name,
    wb.source_type,
    wb.word_count as stored_count,
    COUNT(wbi.id) as actual_count
FROM vocab_app.word_books wb
LEFT JOIN vocab_app.word_book_items wbi ON wbi.word_book_id = wb.id
GROUP BY wb.id, wb.name, wb.source_type, wb.word_count
ORDER BY wb.source_type, wb.name;

-- 2. 检查 source_type 分布
SELECT 
    source_type,
    COUNT(*) as book_count,
    SUM(word_count) as total_words
FROM vocab_app.word_books
GROUP BY source_type;
