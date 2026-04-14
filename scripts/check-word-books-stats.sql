-- 检查 word_books 表中自定义单词书的计数字段
SELECT 
    id,
    name,
    word_count,
    mastered_count,
    learning_count,
    new_count,
    source_type
FROM vocab_app.word_books
WHERE id = '44f4f389-e5ba-40b4-ad09-5119c0e4719c';
