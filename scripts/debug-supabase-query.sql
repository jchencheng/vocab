-- 模拟 API 中的查询
-- 1. 检查 word_book_items 表中这些书的数据
SELECT word_book_id, status, COUNT(*) as count
FROM vocab_app.word_book_items
WHERE word_book_id IN (
    '261ca44f-f883-4012-af2d-218e9d1c8270',
    '44f4f389-e5ba-40b4-ad09-5119c0e4719c'
)
GROUP BY word_book_id, status
ORDER BY word_book_id, status;

-- 2. 检查这些书的详细信息
SELECT 
    wb.id,
    wb.name,
    wb.source_type,
    COUNT(wbi.id) as total_items
FROM vocab_app.word_books wb
LEFT JOIN vocab_app.word_book_items wbi ON wbi.word_book_id = wb.id
WHERE wb.id IN (
    '261ca44f-f883-4012-af2d-218e9d1c8270',
    '44f4f389-e5ba-40b4-ad09-5119c0e4719c'
)
GROUP BY wb.id, wb.name, wb.source_type;

-- 3. 检查 word_book_items 的 schema
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'vocab_app' AND table_name = 'word_book_items';
