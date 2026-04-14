import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../services/supabase';

// GET /api/dashboard?userId=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    // 并行获取所有 Dashboard 数据
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

    // 获取今日进度
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

    // 获取今日待复习数量
    const now = new Date().toISOString();
    const { count: dueToday } = await supabase
      .from('word_book_items')
      .select('*', { count: 'exact', head: true })
      .in('word_book_id', bookIds)
      .lte('next_review_at', now)
      .not('status', 'eq', 'mastered');

    const stats = {
      totalWords,
      dueToday: dueToday || 0,
      mastered,
      learning,
      completedToday,
      streak: 0,
    };

    // 转换 settings 格式
    const appSettings = {
      maxDailyReviews: settings?.max_daily_reviews,
      darkMode: settings?.dark_mode,
      studyMode: settings?.study_mode,
      primaryWordBookId: settings?.primary_word_book_id,
    };

    return NextResponse.json({
      settings: appSettings,
      stats,
      wordBooks: wordBooks || [],
      learningSequence: learningSequence || [],
      customBooks: customBooks || [],
    });
  } catch (error: any) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
