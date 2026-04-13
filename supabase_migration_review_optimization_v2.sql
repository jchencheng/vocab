-- 更新获取复习单词的数据库函数，支持 dictionary 数据和 is_excluded 标记

DROP FUNCTION IF EXISTS vocab_app.get_words_for_review(UUID, BIGINT, INTEGER);

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
    -- 优先使用 dictionary 的 phonetic
    COALESCE(d.phonetic, w.phonetic) as phonetic,
    -- 优先使用 dictionary 的 translation，否则从 meanings 提取
    COALESCE(
      d.translation,
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
  -- 支持两种 source_type: 'word' 和 'dictionary'
  LEFT JOIN vocab_app.words w ON wbi.word_id = w.id
  LEFT JOIN vocab_app.dictionary d ON wbi.dictionary_id = d.id
  LEFT JOIN vocab_app.user_word_progress p 
    ON COALESCE(w.id, wbi.word_id) = p.word_id AND p.user_id = ls.user_id
  WHERE ls.user_id = p_user_id
    -- 排除 is_excluded = true 的单词
    AND (p.is_excluded IS NULL OR p.is_excluded = false)
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

-- 添加注释
COMMENT ON FUNCTION vocab_app.get_words_for_review IS 
'获取用户需要复习的单词列表，支持 dictionary 数据，排除 is_excluded 标记的单词';
