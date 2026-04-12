-- 插入示例系统单词书
INSERT INTO vocab_app.word_books (
    user_id,
    name,
    description,
    source_type,
    category,
    word_count,
    is_active
) VALUES (
    null,
    '经济学人高频单词',
    '精选经济学人文章中的高频词汇',
    'system',
    'Reading',
    2500,
    true
);

-- 插入另一个示例系统单词书
INSERT INTO vocab_app.word_books (
    user_id,
    name,
    description,
    source_type,
    category,
    word_count,
    is_active
) VALUES (
    null,
    'CET-4 词汇',
    '大学英语四级考试核心词汇',
    'system',
    'CET4',
    4500,
    true
);

-- 插入第三个示例系统单词书
INSERT INTO vocab_app.word_books (
    user_id,
    name,
    description,
    source_type,
    category,
    word_count,
    is_active
) VALUES (
    null,
    'CET-6 词汇',
    '大学英语六级考试核心词汇',
    'system',
    'CET6',
    5500,
    true
);
