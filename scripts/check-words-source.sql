-- 检查 words 表中系统单词书的单词
SELECT 
    wb.name,
    wb.id as book_id,
    COUNT(w.id) as words_in_words_table
FROM vocab_app.word_books wb
LEFT JOIN vocab_app.words w ON w.source_wordbook_id = wb.id
WHERE wb.source_type = 'system'
GROUP BY wb.id, wb.name
ORDER BY wb.name;

-- 检查 CET-4 和 CET-6 的单词在 words 表中的情况
SELECT 
    source,
    source_wordbook_id,
    COUNT(*) as count
FROM vocab_app.words
WHERE source LIKE '%CET%'
GROUP BY source, source_wordbook_id;

-- 检查 words 表中所有不同的 source
SELECT DISTINCT source FROM vocab_app.words WHERE source IS NOT NULL LIMIT 20;
