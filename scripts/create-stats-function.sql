-- 创建数据库函数来获取单词书统计
-- 这样可以避免 1000 条查询限制

CREATE OR REPLACE FUNCTION vocab_app.get_wordbook_stats(book_ids uuid[])
RETURNS TABLE (
    word_book_id uuid,
    total bigint,
    mastered bigint,
    learning bigint,
    ignored bigint,
    new_words bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wbi.word_book_id,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE wbi.status = 'mastered') as mastered,
        COUNT(*) FILTER (WHERE wbi.status = 'learning') as learning,
        COUNT(*) FILTER (WHERE wbi.status = 'ignored') as ignored,
        COUNT(*) FILTER (WHERE wbi.status = 'new' OR wbi.status IS NULL) as new_words
    FROM vocab_app.word_book_items wbi
    WHERE wbi.word_book_id = ANY(book_ids)
    GROUP BY wbi.word_book_id;
END;
$$ LANGUAGE plpgsql;

-- 测试函数
SELECT * FROM vocab_app.get_wordbook_stats(ARRAY[
    '261ca44f-f883-4012-af2d-218e9d1c8270'::uuid,
    '44f4f389-e5ba-40b4-ad09-5119c0e4719c'::uuid
]);
