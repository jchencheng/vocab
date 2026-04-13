-- ============================================
-- 迁移：为 words 表添加 source 字段，用于追踪单词来源
-- ============================================

-- 1. 添加 source 字段（单词来源：'manual' 手动添加, 'wordbook' 从单词书导入）
ALTER TABLE vocab_app.words 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- 2. 添加 source_wordbook_id 字段（记录从哪个单词书导入）
ALTER TABLE vocab_app.words 
ADD COLUMN IF NOT EXISTS source_wordbook_id UUID REFERENCES vocab_app.word_books(id) ON DELETE SET NULL;

-- 3. 创建索引，方便查询
CREATE INDEX IF NOT EXISTS idx_words_source ON vocab_app.words(user_id, source);
CREATE INDEX IF NOT EXISTS idx_words_source_wordbook ON vocab_app.words(user_id, source_wordbook_id);

-- ============================================
-- 使用说明
-- ============================================
-- 1. 在 Supabase Dashboard 的 SQL Editor 中执行此脚本
-- 2. 执行后，可以区分用户手动添加的单词和从单词书导入的单词
-- 3. 移除单词书时，可以只删除从该单词书导入的单词
-- ============================================
