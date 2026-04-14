-- 检查 word_book_items 表中这些书的数据分布
SELECT 
    '经济学人' as book,
    status,
    COUNT(*) as count
FROM vocab_app.word_book_items
WHERE word_book_id = '261ca44f-f883-4012-af2d-218e9d1c8270'
GROUP BY status
UNION ALL
SELECT 
    '自定义' as book,
    status,
    COUNT(*) as count
FROM vocab_app.word_book_items
WHERE word_book_id = '44f4f389-e5ba-40b4-ad09-5119c0e4719c'
GROUP BY status
ORDER BY book, status;

-- 总数量
SELECT 
    '经济学人总计' as info,
    COUNT(*) as total
FROM vocab_app.word_book_items
WHERE word_book_id = '261ca44f-f883-4012-af2d-218e9d1c8270'
UNION ALL
SELECT 
    '自定义总计' as info,
    COUNT(*) as total
FROM vocab_app.word_book_items
WHERE word_book_id = '44f4f389-e5ba-40b4-ad09-5119c0e4719c';
