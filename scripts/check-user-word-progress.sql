-- 检查 user_word_progress 表结构
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'vocab_app' 
    AND table_name = 'user_word_progress'
ORDER BY ordinal_position;

-- 查看 user_word_progress 中的记录
SELECT 
    uwp.word_id,
    uwp.review_count,
    uwp.interval,
    uwp.ease_factor,
    w.word
FROM vocab_app.user_word_progress uwp
JOIN vocab_app.words w ON w.id = uwp.word_id
WHERE uwp.word_id IN (
    SELECT wbi.word_id 
    FROM vocab_app.word_book_items wbi
    JOIN vocab_app.word_books wb ON wb.id = wbi.word_book_id
    WHERE wb.source_type = 'custom'
)
LIMIT 10;

-- 检查 word_book_items 中自定义单词书的状态
SELECT 
    wbi.word_id,
    wbi.status,
    w.word
FROM vocab_app.word_book_items wbi
JOIN vocab_app.word_books wb ON wb.id = wbi.word_book_id
JOIN vocab_app.words w ON w.id = wbi.word_id
WHERE wb.source_type = 'custom';

-- 检查触发器
SELECT 
    trigger_name,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'vocab_app'
AND event_object_table = 'word_book_items';
