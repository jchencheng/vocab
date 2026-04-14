import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// 使用 Publishable API key (ANON_KEY) 替代 Secret key
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set. API will not work properly.');
}

// 服务端 Supabase 配置 - 使用 Publishable key (ANON_KEY) 和 vocab_app schema
export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'dummy-key-for-build', {
  db: {
    schema: 'vocab_app',
  },
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
