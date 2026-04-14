-- ============================================
-- 单词书查询优化
-- ============================================

-- 1. 为 word_book_items 表添加索引
CREATE INDEX IF NOT EXISTS idx_word_book_items_book_id_added_at 
  ON vocab_app.word_book_items(word_book_id, added_at DESC);

CREATE INDEX IF NOT EXISTS idx_word_book_items_book_id_status 
  ON vocab_app.word_book_items(word_book_id, status) 
  WHERE status IS NOT NULL;

-- 2. 创建单词书单词列表视图（预计算，减少 JOIN 开销）
CREATE OR REPLACE VIEW vocab_app.wordbook_words_view AS
SELECT 
  wbi.id as item_id,
  wbi.word_book_id,
  wbi.source_type,
  wbi.dictionary_id,
  wbi.added_at,
  wbi.status,
  
  -- words 表数据
  w.id as word_id,
  w.word as word_text,
  w.phonetic as word_phonetic,
  w.meanings as word_meanings,
  w.source_type as word_source_type,
  
  -- dictionary 表数据
  d.id as dict_id,
  d.word as dict_word,
  d.phonetic as dict_phonetic,
  d.translation as dict_translation
  
FROM vocab_app.word_book_items wbi
LEFT JOIN vocab_app.words w ON wbi.word_id = w.id
LEFT JOIN vocab_app.dictionary d ON wbi.dictionary_id = d.id;

-- 3. 创建轻量级单词书单词查询函数
CREATE OR REPLACE FUNCTION vocab_app.get_wordbook_words_light(
  p_word_book_id UUID,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  word TEXT,
  phonetic TEXT,
  meanings JSONB,
  source_type TEXT,
  total_count BIGINT
) AS $$
DECLARE
  v_total BIGINT;
BEGIN
  -- 获取总数
  SELECT COUNT(*) INTO v_total
  FROM vocab_app.word_book_items
  WHERE word_book_id = p_word_book_id;

  -- 返回分页数据
  RETURN QUERY
  SELECT 
    COALESCE(w.id, d.id) as id,
    COALESCE(w.word, d.word) as word,
    CASE 
      WHEN wbi.source_type = 'dictionary' THEN d.phonetic
      ELSE w.phonetic
    END as phonetic,
    CASE 
      WHEN wbi.source_type = 'dictionary' AND d.translation IS NOT NULL THEN
        (SELECT jsonb_agg(
          jsonb_build_object(
            'partOfSpeech', parts.pos,
            'definitions', parts.defs
          )
        )
        FROM (
          SELECT 
            (regexp_split_to_array(trim(line), '\.'))[1] as pos,
            (
              SELECT jsonb_agg(jsonb_build_object('definition', trim(def)))
              FROM unnest(string_to_array((regexp_split_to_array(trim(line), '\.'))[2], ',')) AS def
              WHERE trim(def) != ''
            ) as defs
          FROM unnest(string_to_array(d.translation, '\n')) AS line
          WHERE trim(line) != '' 
            AND line ~ '^[a-z]+\.'
            AND (regexp_split_to_array(trim(line), '\.'))[1] IS NOT NULL
        ) parts
        WHERE parts.defs IS NOT NULL)
      ELSE w.meanings
    END as meanings,
    wbi.source_type,
    v_total as total_count
  FROM vocab_app.word_book_items wbi
  LEFT JOIN vocab_app.words w ON wbi.word_id = w.id
  LEFT JOIN vocab_app.dictionary d ON wbi.dictionary_id = d.id
  WHERE wbi.word_book_id = p_word_book_id
  ORDER BY wbi.added_at DESC
  LIMIT p_page_size
  OFFSET (p_page - 1) * p_page_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 创建单词书统计信息函数（减少重复查询）
CREATE OR REPLACE FUNCTION vocab_app.get_wordbook_stats(
  p_word_book_id UUID
)
RETURNS TABLE (
  total_words BIGINT,
  learning_words BIGINT,
  mastered_words BIGINT,
  excluded_words BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_words,
    COUNT(*) FILTER (WHERE status = 'learning')::BIGINT as learning_words,
    COUNT(*) FILTER (WHERE status = 'mastered')::BIGINT as mastered_words,
    COUNT(*) FILTER (WHERE status = 'excluded')::BIGINT as excluded_words
  FROM vocab_app.word_book_items
  WHERE word_book_id = p_word_book_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
