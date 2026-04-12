import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bmvtpdofmnbrymosrwhy.supabase.co';
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseKey) {
  console.warn('SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is not set. API will not work properly.');
}

// 服务端 Supabase 配置 - 使用 Secret key 和 vocab_app schema
export const supabase = createClient(supabaseUrl, supabaseKey || 'dummy-key-for-build', {
  db: {
    schema: 'vocab_app',
  },
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
