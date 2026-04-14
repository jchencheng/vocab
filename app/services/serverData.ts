// 服务端数据获取函数 - 用于 Server Components
import { createClient } from '@supabase/supabase-js';
import type { Word, AppSettings, UserDailyProgress } from '../types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// 使用 Publishable API key (ANON_KEY) 替代 Service Role Key
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// 服务端 Supabase 客户端（使用 Publishable Key / ANON_KEY）
function getServerClient() {
  return createClient(SUPABASE_URL || 'https://placeholder.supabase.co', SUPABASE_KEY || 'dummy-key-for-build', {
    auth: {
      persistSession: false,
    },
  });
}

// 转换函数：SupabaseWord -> Word
function fromSupabaseWord(data: any): Word {
  return {
    id: data.id,
    word: data.word,
    phonetic: data.phonetic || undefined,
    phonetics: data.phonetics || [],
    meanings: data.meanings || [],
    tags: data.tags || [],
    customNote: data.custom_note || undefined,
    interval: data.interval || 0,
    easeFactor: data.ease_factor || 2.5,
    reviewCount: data.review_count || 0,
    nextReviewAt: data.next_review_at || Date.now(),
    createdAt: data.created_at || Date.now(),
    updatedAt: data.updated_at || Date.now(),
    quality: data.quality || 0,
  };
}

// 转换函数：SupabaseSettings -> AppSettings
function fromSupabaseSettings(data: any): AppSettings {
  return {
    maxDailyReviews: data.max_daily_reviews || 20,
    darkMode: data.dark_mode || false,
    studyMode: data.study_mode || 'book-priority',
    primaryWordBookId: data.primary_word_book_id || null,
  };
}

/**
 * 获取用户的所有单词（服务端版本）
 */
export async function fetchWordsServer(userId: string): Promise<Word[]> {
  const supabase = getServerClient();
  
  const { data, error } = await supabase
    .from('words')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching words:', error);
    return [];
  }
  
  return (data || []).map(fromSupabaseWord);
}

/**
 * 获取用户设置（服务端版本）
 */
export async function fetchSettingsServer(userId: string): Promise<AppSettings | null> {
  const supabase = getServerClient();
  
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      // 没有找到记录，返回默认设置
      return {
        maxDailyReviews: 20,
        darkMode: false,
        studyMode: 'book-priority',
        primaryWordBookId: null,
      };
    }
    console.error('Error fetching settings:', error);
    return null;
  }
  
  return data ? fromSupabaseSettings(data) : null;
}

/**
 * 获取今日待复习单词数量（服务端版本）
 */
export async function fetchDueTodayCountServer(
  userId: string,
  maxDailyReviews: number = 20
): Promise<number> {
  const supabase = getServerClient();
  const now = Date.now();
  
  // 首先获取今日已完成的复习数量
  const today = new Date().toISOString().split('T')[0];
  const { data: progressData } = await supabase
    .from('daily_progress')
    .select('completed_word_ids')
    .eq('user_id', userId)
    .eq('review_date', today)
    .single();
  
  const completedCount = progressData?.completed_word_ids?.length || 0;
  const remainingLimit = Math.max(0, maxDailyReviews - completedCount);
  
  // 获取待复习的单词数量
  const { count, error } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .lte('next_review_at', now);
  
  if (error) {
    console.error('Error fetching due today count:', error);
    return 0;
  }
  
  return Math.min(count || 0, remainingLimit);
}

/**
 * 获取每日进度（服务端版本）
 */
export async function fetchDailyProgressServer(
  userId: string,
  date?: string
): Promise<UserDailyProgress | null> {
  const supabase = getServerClient();
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('daily_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('review_date', targetDate)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching daily progress:', error);
    return null;
  }
  
  if (!data) return null;
  
  return {
    id: data.id,
    userId: data.user_id,
    reviewDate: data.review_date,
    queueWordIds: data.queue_word_ids || [],
    currentIndex: data.current_index || 0,
    completedWordIds: data.completed_word_ids || [],
    postponedWordIds: data.postponed_word_ids || [],
    maxDailyReviews: data.max_daily_reviews || 20,
    isCompleted: data.is_completed || false,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * 获取仪表盘统计数据（聚合查询）
 */
export async function fetchDashboardStatsServer(userId: string): Promise<{
  totalWords: number;
  dueToday: number;
  mastered: number;
  learning: number;
  completedToday: number;
}> {
  const supabase = getServerClient();
  const now = Date.now();
  const today = new Date().toISOString().split('T')[0];
  
  // 并行获取所有数据
  const [
    { data: words, error: wordsError },
    { data: progressData },
    { data: settingsData },
  ] = await Promise.all([
    supabase
      .from('words')
      .select('interval, review_count, next_review_at')
      .eq('user_id', userId),
    supabase
      .from('daily_progress')
      .select('completed_word_ids')
      .eq('user_id', userId)
      .eq('review_date', today)
      .single(),
    supabase
      .from('settings')
      .select('max_daily_reviews')
      .eq('user_id', userId)
      .single(),
  ]);
  
  if (wordsError) {
    console.error('Error fetching dashboard stats:', wordsError);
  }
  
  const wordList = words || [];
  const maxDailyReviews = settingsData?.max_daily_reviews || 20;
  const completedToday = progressData?.completed_word_ids?.length || 0;
  const remainingLimit = Math.max(0, maxDailyReviews - completedToday);
  
  // 计算统计数据
  const totalWords = wordList.length;
  const mastered = wordList.filter(w => w.interval >= 30).length;
  const learning = wordList.filter(w => w.interval < 30 && w.review_count > 0).length;
  const dueAll = wordList.filter(w => w.next_review_at <= now).length;
  const dueToday = Math.min(dueAll, remainingLimit);
  
  return {
    totalWords,
    dueToday,
    mastered,
    learning,
    completedToday,
  };
}

/**
 * 获取最近添加的单词（限制数量）
 */
export async function fetchRecentWordsServer(
  userId: string,
  limit: number = 10
): Promise<Word[]> {
  const supabase = getServerClient();
  
  const { data, error } = await supabase
    .from('words')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching recent words:', error);
    return [];
  }
  
  return (data || []).map(fromSupabaseWord);
}
