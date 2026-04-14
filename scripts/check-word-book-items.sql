-- 检查 word_book_items 表中经济学人单词书的数据
SELECT 
    '经济学人高频单词' as book_name,
    wb.id as book_id,
    COUNT(wbi.id) as item_count
FROM vocab_app.word_books wb
LEFT JOIN vocab_app.word_book_items wbi ON wbi.word_book_id = wb.id
WHERE wb.name = '经济学人高频单词'
GROUP BY wb.id;

-- 检查 word_book_items 表中自定义单词书的数据
SELECT 
    '自定义单词书' as book_name,
    wb.id as book_id,
    COUNT(wbi.id) as item_count
FROM vocab_app.word_books wb
LEFT JOIN vocab_app.word_book_items wbi ON wbi.word_book_id = wb.id
WHERE wb.name = '自定义单词书'
GROUP BY wb.id;

-- 直接查询 word_book_items 表
SELECT word_book_id, COUNT(*) as count
FROM vocab_app.word_book_items
WHERE word_book_id IN (
    '261ca44f-f883-4012-af2d-218e9d1c8270',
    '44f4f389-e5ba-40b4-ad09-5119c0e4719c'
)
GROUP BY word_book_id;
