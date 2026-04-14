-- 检查 user_word_progress 和 word_book_items 的关联
-- 1. 查看 user_word_progress 中的记录
SELECT 
    uwp.word_id,
    uwp.status,
    uwp.review_count,
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

-- 2. 检查 word_book_items 中这些单词的状态
SELECT 
    wbi.word_id,
    wbi.status,
    w.word
FROM vocab_app.word_book_items wbi
JOIN vocab_app.word_books wb ON wb.id = wbi.word_book_id
JOIN vocab_app.words w ON w.id = wbi.word_id
WHERE wb.source_type = 'custom';

-- 3. 检查触发器是否存在
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'vocab_app'
AND event_object_table = 'word_book_items';
