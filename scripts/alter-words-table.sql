-- ============================================
-- 修改 words 表，允许 user_id 为 null（用于系统预置单词）
-- ============================================

-- 1. 删除外键约束（如果存在）
ALTER TABLE vocab_app.words 
DROP CONSTRAINT IF EXISTS words_user_id_fkey;

-- 2. 修改 user_id 列，允许为 null
ALTER TABLE vocab_app.words 
ALTER COLUMN user_id DROP NOT NULL;

-- 3. 重新添加外键约束，允许 null
ALTER TABLE vocab_app.words 
ADD CONSTRAINT words_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES vocab_app.users(id) ON DELETE CASCADE;

-- 4. 添加注释说明
COMMENT ON COLUMN vocab_app.words.user_id IS '用户ID，null 表示系统预置单词';

-- 5. 创建新的索引（支持 null 值查询）
CREATE INDEX IF NOT EXISTS idx_words_system ON vocab_app.words(user_id) WHERE user_id IS NULL;

-- ============================================
-- 验证修改
-- ============================================
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'vocab_app' 
AND table_name = 'words' 
AND column_name = 'user_id';
