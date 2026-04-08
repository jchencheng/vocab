import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://bmvtpdofmnbrymosrwhy.supabase.co';
const supabaseKey = process.env.SUPABASE_SECRET_KEY || '';

if (!supabaseKey) {
  console.warn('SUPABASE_SECRET_KEY is not set. API will not work properly.');
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
