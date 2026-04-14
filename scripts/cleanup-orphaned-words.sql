-- =====================================================
-- 清理脚本：删除孤立的单词记录
-- 这些单词的 user_id 不在 vocab_app.users 表中
-- 注意：运行前请确认这些记录确实不需要保留
-- =====================================================

-- 先查看将要被删除的记录
SELECT 
    '将要删除的孤立记录' as info,
    w.id,
    w.word,
    w.user_id,
    w.created_at,
    w.source
FROM vocab_app.words w
WHERE w.user_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM vocab_app.users u WHERE u.id = w.user_id);

-- 统计数量
SELECT 
    '孤立记录统计' as info,
    COUNT(*) as orphaned_word_count,
    COUNT(DISTINCT user_id) as orphaned_user_count
FROM vocab_app.words w
WHERE w.user_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM vocab_app.users u WHERE u.id = w.user_id);

-- =====================================================
-- 如需删除，请取消下面的注释并运行
-- =====================================================
-- BEGIN;
-- 
-- DELETE FROM vocab_app.words
-- WHERE user_id IS NOT NULL 
--   AND NOT EXISTS (SELECT 1 FROM vocab_app.users u WHERE u.id = vocab_app.words.user_id);
-- 
-- SELECT '已删除孤立记录' as info, COUNT(*) as deleted_count FROM vocab_app.words w
-- WHERE w.user_id IS NOT NULL 
--   AND NOT EXISTS (SELECT 1 FROM vocab_app.users u WHERE u.id = w.user_id);
-- 
-- COMMIT;
