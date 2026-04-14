-- 检查系统单词书的详细数据
SELECT 
    wb.id,
    wb.name,
    wb.word_count as stored_count,
    COUNT(wbi.id) as actual_item_count,
    (SELECT COUNT(*) FROM vocab_app.words w WHERE w.source_wordbook_id = wb.id) as words_count
FROM vocab_app.word_books wb
LEFT JOIN vocab_app.word_book_items wbi ON wbi.word_book_id = wb.id
WHERE wb.source_type = 'system'
GROUP BY wb.id, wb.name, wb.word_count
ORDER BY wb.name;

-- 检查 word_book_items 中系统单词书的单词分布
SELECT 
    wb.name,
    COUNT(wbi.id) as item_count,
    COUNT(CASE WHEN wbi.status = 'mastered' THEN 1 END) as mastered,
    COUNT(CASE WHEN wbi.status = 'learning' THEN 1 END) as learning,
    COUNT(CASE WHEN wbi.status = 'new' THEN 1 END) as new_words
FROM vocab_app.word_books wb
LEFT JOIN vocab_app.word_book_items wbi ON wbi.word_book_id = wb.id
WHERE wb.source_type = 'system'
GROUP BY wb.id, wb.name;
