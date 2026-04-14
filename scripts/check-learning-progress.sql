-- 检查自定义单词书的学习进度统计
-- 1. 检查 word_books 表中的计数字段
SELECT 
    id,
    name,
    word_count,
    mastered_count,
    learning_count,
    new_count
FROM vocab_app.word_books
WHERE source_type = 'custom';

-- 2. 检查 word_book_items 中自定义单词书的实际状态分布
SELECT 
    wb.name,
    wb.id,
    wbi.status,
    COUNT(*) as count
FROM vocab_app.word_books wb
JOIN vocab_app.word_book_items wbi ON wbi.word_book_id = wb.id
WHERE wb.source_type = 'custom'
GROUP BY wb.id, wb.name, wbi.status;

-- 3. 检查 user_word_progress 中是否有自定义单词书单词的学习记录
SELECT 
    wb.name,
    COUNT(uwp.id) as progress_count
FROM vocab_app.word_books wb
JOIN vocab_app.word_book_items wbi ON wbi.word_book_id = wb.id
LEFT JOIN vocab_app.user_word_progress uwp ON uwp.word_id = wbi.word_id
WHERE wb.source_type = 'custom'
GROUP BY wb.id, wb.name;
