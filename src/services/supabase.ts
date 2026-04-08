import { createClient } from '@supabase/supabase-js';
import type { Word, AIContext, AppSettings, AppUser } from '../types';

const SUPABASE_URL = 'https://bmvtpdofmnbrymosrwhy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_0FkwKPJWq7-e3SZxbbdlMA_35Yd19Ft';

// Schema 名称 - 用于隔离不同应用的数据
export const SCHEMA_NAME = 'vocab_app';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: {
    schema: SCHEMA_NAME,
  },
});

// 类型定义
export interface SupabaseUser {
  id: string;
  email: string;
  password_hash: string;
  created_at: number;
  updated_at: number;
}

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

// 转换函数：AppUser -> SupabaseUser
export function toSupabaseUser(user: AppUser): SupabaseUser {
  return {
    id: user.id,
    email: user.email,
    password_hash: user.passwordHash,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  };
}

// 转换函数：SupabaseUser -> AppUser
export function fromSupabaseUser(data: SupabaseUser): AppUser {
  return {
    id: data.id,
    email: data.email,
    passwordHash: data.password_hash,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// 转换函数：Word -> SupabaseWord
export function toSupabaseWord(word: Word, userId: string): Omit<SupabaseWord, 'id' | 'user_id'> & { id?: string; user_id?: string } {
  return {
    id: word.id,
    user_id: userId,
    word: word.word,
    phonetic: word.phonetic || null,
    phonetics: word.phonetics || [],
    meanings: word.meanings,
    tags: word.tags,
    custom_note: word.customNote || null,
    interval: word.interval,
    ease_factor: word.easeFactor,
    review_count: word.reviewCount,
    next_review_at: word.nextReviewAt,
    created_at: word.createdAt,
    updated_at: word.updatedAt,
    quality: word.quality,
  };
}

// 转换函数：SupabaseWord -> Word
export function fromSupabaseWord(data: SupabaseWord): Word {
  return {
    id: data.id,
    word: data.word,
    phonetic: data.phonetic || undefined,
    phonetics: data.phonetics || [],
    meanings: data.meanings,
    tags: data.tags,
    customNote: data.custom_note || undefined,
    interval: data.interval,
    easeFactor: data.ease_factor,
    reviewCount: data.review_count,
    nextReviewAt: data.next_review_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    quality: data.quality,
  };
}

// 转换函数：AIContext -> SupabaseContext
export function toSupabaseContext(context: AIContext, userId: string): Omit<SupabaseContext, 'id' | 'user_id'> & { id?: string; user_id?: string } {
  return {
    id: context.id,
    user_id: userId,
    content: context.content,
    word_ids: context.wordIds,
    created_at: context.createdAt,
  };
}

// 转换函数：SupabaseContext -> AIContext
export function fromSupabaseContext(data: SupabaseContext): AIContext {
  return {
    id: data.id,
    content: data.content,
    wordIds: data.word_ids,
    createdAt: data.created_at,
  };
}

// 转换函数：AppSettings -> SupabaseSettings
export function toSupabaseSettings(settings: AppSettings, userId: string): Omit<SupabaseSettings, 'id' | 'user_id'> & { id?: string; user_id?: string } {
  return {
    user_id: userId,
    max_daily_reviews: settings.maxDailyReviews || 50,
    dark_mode: settings.darkMode || false,
    updated_at: Date.now(),
  };
}

// 转换函数：SupabaseSettings -> AppSettings
export function fromSupabaseSettings(data: SupabaseSettings): AppSettings {
  return {
    maxDailyReviews: data.max_daily_reviews,
    darkMode: data.dark_mode,
  };
}
