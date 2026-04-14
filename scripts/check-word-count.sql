-- 检查 word_books 表中 word_count 字段的值
SELECT 
    name,
    word_count,
    (SELECT COUNT(*) FROM vocab_app.word_book_items WHERE word_book_id = wb.id) as actual_items
FROM vocab_app.word_books wb
WHERE source_type = 'system';
