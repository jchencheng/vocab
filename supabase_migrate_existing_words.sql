-- ============================================
-- 迁移脚本：将已存在的词典词标记为 dictionary 类型
-- ============================================

-- 更新 word_book_items 表中已存在且匹配 dictionary 表的记录
-- 将它们的 source_type 设置为 'dictionary'，并设置 dictionary_id
UPDATE vocab_app.word_book_items wbi
SET 
  source_type = 'dictionary',
  dictionary_id = d.id
FROM vocab_app.dictionary d
JOIN vocab_app.words w ON LOWER(w.word) = LOWER(d.word)
WHERE wbi.word_id = w.id
  AND wbi.source_type = 'word'
  AND LOWER(w.word) = LOWER(d.word);

-- 更新 words 表中已存在且匹配 dictionary 表的记录
-- 将它们的 source_type 设置为 'dictionary'，并更新 meanings 和 phonetic
-- 使用子查询确保 meanings 不为 null
UPDATE vocab_app.words w
SET 
  source_type = 'dictionary',
  source_word_id = d.id,
  phonetic = COALESCE(d.phonetic, w.phonetic),
  meanings = COALESCE(
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
        AND (regexp_split_to_array(trim(line), '\.'))[2] IS NOT NULL
    ) parts
    WHERE parts.defs IS NOT NULL
    ),
    w.meanings,  -- 如果转换失败，保留原来的 meanings
    '[{"partOfSpeech": "general", "definitions": [{"definition": "词典释义"}]}]'::jsonb  -- 最后的默认值
  )
FROM vocab_app.dictionary d
WHERE LOWER(w.word) = LOWER(d.word)
  AND (w.source_type != 'dictionary' OR w.source_type IS NULL);

-- 显示迁移结果
SELECT 
  'word_book_items 迁移数量' as description,
  COUNT(*) as count
FROM vocab_app.word_book_items 
WHERE source_type = 'dictionary'
UNION ALL
SELECT 
  'words 表词典词数量' as description,
  COUNT(*) as count
FROM vocab_app.words 
WHERE source_type = 'dictionary';
