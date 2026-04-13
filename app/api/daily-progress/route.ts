import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../services/supabase';

/**
 * GET /api/daily-progress?userId=xxx&date=YYYY-MM-DD
 * 
 * 获取用户指定日期的复习进度
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('user_daily_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('review_date', date)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching daily progress:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 返回简化格式
    if (data) {
      return NextResponse.json({
        userId: data.user_id,
        reviewDate: data.review_date,
        currentIndex: data.current_index,
        maxDailyReviews: data.max_daily_reviews,
      });
    }
    
    return NextResponse.json(null);
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/daily-progress
 * 
 * 创建或更新每日复习进度（只保存 currentIndex）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, reviewDate, currentIndex, maxDailyReviews } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const date = reviewDate || new Date().toISOString().split('T')[0];
    const now = Date.now();

    const { data, error } = await supabase
      .from('user_daily_progress')
      .upsert({
        user_id: userId,
        review_date: date,
        current_index: currentIndex ?? 0,
        max_daily_reviews: maxDailyReviews || 50,
        updated_at: now,
      }, {
        onConflict: 'user_id,review_date'
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving daily progress:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      userId: data.user_id,
      reviewDate: data.review_date,
      currentIndex: data.current_index,
      maxDailyReviews: data.max_daily_reviews,
    });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/daily-progress
 * 
 * 更新当前索引
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, reviewDate, currentIndex } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const date = reviewDate || new Date().toISOString().split('T')[0];
    const now = Date.now();

    const { data, error } = await supabase
      .from('user_daily_progress')
      .update({
        current_index: currentIndex,
        updated_at: now,
      })
      .eq('user_id', userId)
      .eq('review_date', date)
      .select()
      .single();

    if (error) {
      console.error('Error updating daily progress:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      userId: data.user_id,
      reviewDate: data.review_date,
      currentIndex: data.current_index,
    });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
