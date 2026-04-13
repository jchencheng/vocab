-- 创建获取复习单词的数据库函数
-- 这个函数使用单次查询 JOIN 获取用户需要复习的单词

CREATE OR REPLACE FUNCTION vocab_app.get_words_for_review(
  p_user_id UUID,
  p_now BIGINT,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  word TEXT,
  phonetic TEXT,
  chinese_definition TEXT,
  "interval" INTEGER,
  ease_factor REAL,
  review_count INTEGER,
  next_review_at BIGINT,
  quality INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.word,
    w.phonetic,
    -- 提取第一个中文释义
    COALESCE(
      w.meanings->0->'definitions'->0->>'chineseDefinition',
      w.meanings->0->'definitions'->0->>'definition',
      ''
    )::TEXT as chinese_definition,
    -- 使用进度记录的值，如果不存在则使用默认值
    COALESCE(p."interval", 0)::INTEGER as "interval",
    COALESCE(p.ease_factor, 2.5)::REAL as ease_factor,
    COALESCE(p.review_count, 0)::INTEGER as review_count,
    -- 如果进度记录不存在或 next_review_at 在未来且 interval=0，则使用当前时间
    CASE 
      WHEN p.id IS NULL THEN p_now
      WHEN p.interval = 0 AND p.next_review_at > p_now THEN p_now
      ELSE p.next_review_at
    END::BIGINT as next_review_at,
    COALESCE(p.quality, 0)::INTEGER as quality
  FROM vocab_app.user_learning_sequences ls
  JOIN vocab_app.word_book_items wbi ON ls.word_book_id = wbi.word_book_id
  JOIN vocab_app.words w ON wbi.word_id = w.id
  LEFT JOIN vocab_app.user_word_progress p 
    ON w.id = p.word_id AND p.user_id = ls.user_id
  WHERE ls.user_id = p_user_id
    -- 只返回需要复习的单词
    AND (
      p.id IS NULL  -- 没有进度记录（新单词）
      OR (p.interval = 0 AND p.next_review_at > p_now)  -- 新单词但设置了未来时间
      OR p.next_review_at <= p_now  -- 到期复习
    )
  ORDER BY 
    -- 优先返回 interval=0 的单词（新单词）
    CASE WHEN COALESCE(p."interval", 0) = 0 THEN 0 ELSE 1 END,
    -- 然后按 next_review_at 排序（先到期的先复习）
    COALESCE(p.next_review_at, p_now)
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 创建索引优化查询性能
-- 如果索引已存在则跳过
DO $$
BEGIN
  -- 为 user_learning_sequences 创建索引
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_learning_sequences_user_id'
  ) THEN
    CREATE INDEX idx_learning_sequences_user_id 
    ON vocab_app.user_learning_sequences(user_id);
  END IF;

  -- 为 word_book_items 创建索引
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_word_book_items_book_id'
  ) THEN
    CREATE INDEX idx_word_book_items_book_id 
    ON vocab_app.word_book_items(word_book_id);
  END IF;

  -- 为 user_word_progress 创建复合索引
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_user_word_progress_user_word'
  ) THEN
    CREATE INDEX idx_user_word_progress_user_word 
    ON vocab_app.user_word_progress(user_id, word_id);
  END IF;

  -- 为 user_word_progress 创建 next_review_at 索引
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_user_word_progress_next_review'
  ) THEN
    CREATE INDEX idx_user_word_progress_next_review 
    ON vocab_app.user_word_progress(user_id, next_review_at);
  END IF;
END $$;

-- 添加注释
COMMENT ON FUNCTION vocab_app.get_words_for_review IS 
'获取用户需要复习的单词列表，使用单次查询 JOIN 优化性能';
