-- ============================================
-- 共享词典数据库迁移方案
-- 1. 创建 dictionary 表存储 50万词典数据
-- 2. 改造 words 表支持引用 dictionary
-- 3. 改造 word_book_items 表支持 dictionary 引用
-- ============================================

-- ============================================
-- 第一步：创建共享词典表
-- ============================================
CREATE TABLE IF NOT EXISTS vocab_app.dictionary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word TEXT NOT NULL,
    phonetic TEXT,
    translation TEXT NOT NULL,
    exchange JSONB,
    created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_dictionary_word ON vocab_app.dictionary(word);
CREATE INDEX IF NOT EXISTS idx_dictionary_word_lower ON vocab_app.dictionary(LOWER(word));

-- 启用 RLS
ALTER TABLE vocab_app.dictionary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on dictionary" ON vocab_app.dictionary
    FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON vocab_app.dictionary TO anon;
GRANT ALL ON vocab_app.dictionary TO authenticated;

-- ============================================
-- 第二步：改造 words 表
-- ============================================
-- 添加 source_type 和 source_word_id 字段
ALTER TABLE vocab_app.words 
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'custom',
ADD COLUMN IF NOT EXISTS source_word_id UUID REFERENCES vocab_app.dictionary(id);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_words_source ON vocab_app.words(source_type, source_word_id);
CREATE INDEX IF NOT EXISTS idx_words_source_lower ON vocab_app.words(LOWER(word));

-- ============================================
-- 第三步：改造 word_books 表
-- ============================================
ALTER TABLE vocab_app.word_books 
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'custom';

CREATE INDEX IF NOT EXISTS idx_word_books_source ON vocab_app.word_books(source_type);

-- ============================================
-- 第四步：改造 word_book_items 表
-- ============================================
ALTER TABLE vocab_app.word_book_items 
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'word',
ADD COLUMN IF NOT EXISTS dictionary_id UUID REFERENCES vocab_app.dictionary(id);

-- 修改约束：允许 word_id 为 null（当 source_type = 'dictionary' 时）
-- 注意：这里不删除原约束，而是通过应用层控制

CREATE INDEX IF NOT EXISTS idx_word_book_items_dictionary ON vocab_app.word_book_items(dictionary_id);
CREATE INDEX IF NOT EXISTS idx_word_book_items_source ON vocab_app.word_book_items(source_type);

-- ============================================
-- 第五步：创建视图方便查询
-- ============================================
-- 创建单词详情视图（合并 words 和 dictionary 数据）
CREATE OR REPLACE VIEW vocab_app.word_details AS
SELECT 
    w.id as word_id,
    w.user_id,
    w.word,
    w.phonetic as user_phonetic,
    d.phonetic as dict_phonetic,
    COALESCE(w.phonetic, d.phonetic) as phonetic,
    w.meanings as user_meanings,
    d.translation as dict_translation,
    w.tags,
    w.custom_note,
    w.interval,
    w.ease_factor,
    w.review_count,
    w.next_review_at,
    w.quality,
    w.source_type,
    w.source_word_id,
    w.created_at,
    w.updated_at
FROM vocab_app.words w
LEFT JOIN vocab_app.dictionary d ON w.source_word_id = d.id;

-- 创建单词书条目详情视图
CREATE OR REPLACE VIEW vocab_app.word_book_item_details AS
SELECT 
    wbi.id,
    wbi.word_book_id,
    wbi.word_id,
    wbi.dictionary_id,
    wbi.source_type,
    wbi.status,
    wbi.added_at,
    wbi.mastered_at,
    CASE 
        WHEN wbi.source_type = 'dictionary' THEN d.word
        ELSE w.word
    END as word,
    CASE 
        WHEN wbi.source_type = 'dictionary' THEN d.phonetic
        ELSE w.phonetic
    END as phonetic,
    CASE 
        WHEN wbi.source_type = 'dictionary' THEN d.translation
        ELSE NULL
    END as translation
FROM vocab_app.word_book_items wbi
LEFT JOIN vocab_app.words w ON wbi.word_id = w.id
LEFT JOIN vocab_app.dictionary d ON wbi.dictionary_id = d.id;

-- 授予视图权限
GRANT SELECT ON vocab_app.word_details TO anon;
GRANT SELECT ON vocab_app.word_details TO authenticated;
GRANT SELECT ON vocab_app.word_book_item_details TO anon;
GRANT SELECT ON vocab_app.word_book_item_details TO authenticated;
