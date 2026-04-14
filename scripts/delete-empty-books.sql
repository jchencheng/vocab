-- 删除 CET-4 和 CET-6 空单词书
-- 先检查要删除的单词书
SELECT id, name, word_count
FROM vocab_app.word_books
WHERE name IN ('CET-4 词汇', 'CET-6 词汇')
  AND source_type = 'system';

-- 删除这些单词书（如果没有关联的 word_book_items）
DELETE FROM vocab_app.word_books
WHERE name IN ('CET-4 词汇', 'CET-6 词汇')
  AND source_type = 'system'
  AND NOT EXISTS (
    SELECT 1 FROM vocab_app.word_book_items wbi
    WHERE wbi.word_book_id = vocab_app.word_books.id
  );

-- 确认删除后的结果
SELECT name, word_count
FROM vocab_app.word_books
WHERE source_type = 'system'
ORDER BY name;
