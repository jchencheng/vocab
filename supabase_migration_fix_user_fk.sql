-- ============================================
-- 修复：将 user_learning_sequences 的外键从 vocab_app.users 改为 auth.users
-- 解决 Supabase Auth 用户无法添加到学习序列的问题
-- ============================================

-- 1. 删除现有的外键约束
ALTER TABLE vocab_app.user_learning_sequences
DROP CONSTRAINT IF EXISTS user_learning_sequences_user_id_fkey;

-- 2. 添加新的外键约束，指向 auth.users
-- 注意：需要确保 auth schema 可访问
ALTER TABLE vocab_app.user_learning_sequences
ADD CONSTRAINT user_learning_sequences_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================
-- 使用说明
-- ============================================
-- 1. 在 Supabase Dashboard 的 SQL Editor 中执行此脚本
-- 2. 执行后，Supabase Auth 用户就可以正常添加到学习序列了
-- ============================================
