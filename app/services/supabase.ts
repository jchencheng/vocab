import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://bmvtpdofmnbrymosrwhy.supabase.co';
const supabaseKey = process.env.SUPABASE_SECRET_KEY || '';

if (!supabaseKey) {
  console.warn('SUPABASE_SECRET_KEY is not set. API will not work properly.');
}

export const supabase = createClient(supabaseUrl, supabaseKey || 'dummy-key-for-build', {
  db: {
    schema: 'vocab_app',
  },
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// 类型定义
export interface SupabaseWord {
  id: string;
  user_id: string;
  word: string;
  phonetic: string | null;
  phonetics: any[];
  meanings: any[];
  tags: string[];
  custom_note: string | null;
  interval: number;
  ease_factor: number;
  review_count: number;
  next_review_at: number;
  created_at: number;
  updated_at: number;
  quality: number;
}

export interface SupabaseContext {
  id: string;
  user_id: string;
  content: string;
  word_ids: string[];
  created_at: number;
}

export interface SupabaseSettings {
  id: string;
  user_id: string;
  max_daily_reviews: number;
  dark_mode: boolean;
  updated_at: number;
}
