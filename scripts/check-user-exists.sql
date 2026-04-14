-- 检查用户是否存在
SELECT 
    '用户是否存在' as check_item,
    EXISTS (
        SELECT 1 FROM vocab_app.users WHERE id = '5bdcafac-8a1f-4000-8b83-fa4bf9766561'
    ) as exists_in_vocab_users,
    EXISTS (
        SELECT 1 FROM auth.users WHERE id = '5bdcafac-8a1f-4000-8b83-fa4bf9766561'
    ) as exists_in_auth_users;

-- 检查 vocab_app.users 表中有哪些用户
SELECT id, email, created_at 
FROM vocab_app.users 
LIMIT 10;
