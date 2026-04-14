import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { DashboardClient } from '../components/DashboardClient';
import type { AppSettings, WordBook, LearningSequenceItem } from '../types';

// 强制动态渲染，避免静态生成问题
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Dashboard 统计数据接口
interface DashboardStats {
  totalWords: number;
  dueToday: number;
  mastered: number;
  learning: number;
  completedToday: number;
  streak: number;
}

// 服务端获取 Dashboard 数据
async function fetchDashboardData(userId: string) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  // 并行获取所有必要数据
  const [
    { data: settings },
    { data: wordBooks },
    { data: learningSequence },
    { data: customBooks },
  ] = await Promise.all([
    // 获取用户设置
    supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .single(),
    
    // 获取系统单词书
    supabase
      .from('word_books')
      .select('*')
      .is('user_id', null)
      .eq('is_active', true),
    
    // 获取学习序列
    supabase
      .from('user_learning_sequences')
      .select(`
        *,
        word_book:word_books(*)
      `)
      .eq('user_id', userId),
    
    // 获取自定义单词书
    supabase
      .from('word_books')
      .select('*')
      .eq('user_id', userId)
      .eq('source_type', 'custom'),
  ]);

  // 获取今日待复习数量
  const today = new Date().toISOString().split('T')[0];
  const { data: dailyProgress } = await supabase
    .from('user_daily_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('review_date', today)
    .single();

  // 计算统计数据
  const maxDailyReviews = settings?.max_daily_reviews || 20;
  const completedToday = dailyProgress?.completed_word_ids?.length || 0;
  
  // 获取所有学习序列中的单词书 ID
  const bookIds = learningSequence?.map((item: any) => 
    item.word_book?.id || item.word_book_id
  ).filter(Boolean) || [];

  // 获取单词书统计
  let totalWords = 0;
  let mastered = 0;
  let learning = 0;
  
  if (bookIds.length > 0) {
    const { data: itemsData } = await supabase
      .from('word_book_items')
      .select('status')
      .in('word_book_id', bookIds);
    
    if (itemsData) {
      totalWords = itemsData.length;
      mastered = itemsData.filter((item: any) => item.status === 'mastered').length;
      learning = itemsData.filter((item: any) => item.status === 'learning').length;
    }
  }

  // 获取今日待复习数量（简化计算）
  const now = new Date().toISOString();
  const { count: dueToday } = await supabase
    .from('word_book_items')
    .select('*', { count: 'exact', head: true })
    .in('word_book_id', bookIds)
    .lte('next_review_at', now)
    .not('status', 'eq', 'mastered');

  const stats: DashboardStats = {
    totalWords,
    dueToday: dueToday || 0,
    mastered,
    learning,
    completedToday,
    streak: 0, // 暂时未实现连续天数统计
  };

  // 转换 settings 格式
  const appSettings: AppSettings = {
    maxDailyReviews: settings?.max_daily_reviews,
    darkMode: settings?.dark_mode,
    studyMode: settings?.study_mode,
    primaryWordBookId: settings?.primary_word_book_id,
  };

  return {
    settings: appSettings,
    stats,
    wordBooks: wordBooks || [],
    learningSequence: learningSequence || [],
    customBooks: customBooks || [],
  };
}

// Server Component - 服务端渲染首页
export default async function DashboardPage() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  // 获取当前用户
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <p className="text-slate-500 dark:text-slate-400">请先登录</p>
        </div>
      </div>
    );
  }

  // 服务端获取 Dashboard 数据
  const initialData = await fetchDashboardData(user.id);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <main className="container mx-auto px-4 py-8">
        <DashboardClient 
          initialData={initialData}
          userId={user.id}
          userEmail={user.email || ''}
        />
      </main>
    </div>
  );
}
