-- 创建获取今日复习数量的数据库函数
-- 这个函数使用单次查询 JOIN 高效计算用户今天需要复习的单词数量

CREATE OR REPLACE FUNCTION vocab_app.get_due_today_count(
  p_user_id UUID,
  p_now BIGINT
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- 计算需要复习的单词数量
  -- 包括：
  -- 1. 没有进度记录的新单词
  -- 2. interval=0 且 next_review_at > now 的新单词
  -- 3. next_review_at <= now 的到期单词
  SELECT COUNT(*)
  INTO v_count
  FROM vocab_app.user_learning_sequences ls
  JOIN vocab_app.word_book_items wbi ON ls.word_book_id = wbi.word_book_id
  JOIN vocab_app.words w ON wbi.word_id = w.id
  LEFT JOIN vocab_app.user_word_progress p 
    ON w.id = p.word_id AND p.user_id = ls.user_id
  WHERE ls.user_id = p_user_id
    -- 只统计需要复习的单词
    AND (
      p.id IS NULL  -- 没有进度记录（新单词）
      OR (p.interval = 0 AND p.next_review_at > p_now)  -- 新单词但设置了未来时间
      OR p.next_review_at <= p_now  -- 到期复习
    );

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql;

-- 添加注释
COMMENT ON FUNCTION vocab_app.get_due_today_count IS 
'获取用户今天需要复习的单词数量，基于学习序列中的单词书';
