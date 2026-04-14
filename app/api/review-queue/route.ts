import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../services/supabase';

/**
 * GET /api/review-queue?userId=xxx&date=YYYY-MM-DD
 * 
 * 获取用户的复习队列缓存（支持跨设备同步）
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const maxDailyReviews = parseInt(searchParams.get('maxDailyReviews') || '50', 10);
  const studyMode = searchParams.get('studyMode') || 'mixed';
  const primaryWordBookId = searchParams.get('primaryWordBookId');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    // 使用 RPC 函数获取或创建复习队列缓存
    const { data, error } = await supabase.rpc('get_or_create_review_queue', {
      p_user_id: userId,
      p_review_date: date,
      p_max_daily_reviews: maxDailyReviews,
      p_study_mode: studyMode,
      p_primary_word_book_id: primaryWordBookId || null,
    });

    if (error) {
      console.error('Error fetching review queue cache:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/review-queue
 * 
 * 保存用户的复习队列缓存（支持跨设备同步）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      reviewDate,
      queueData,
      currentIndex,
      maxDailyReviews,
      studyMode,
      primaryWordBookId,
    } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const date = reviewDate || new Date().toISOString().split('T')[0];

    const { error } = await supabase.rpc('save_review_queue', {
      p_user_id: userId,
      p_review_date: date,
      p_queue_data: queueData,
      p_current_index: currentIndex ?? 0,
      p_max_daily_reviews: maxDailyReviews || 50,
      p_study_mode: studyMode || 'mixed',
      p_primary_word_book_id: primaryWordBookId || null,
    });

    if (error) {
      console.error('Error saving review queue cache:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/review-queue
 * 
 * 更新复习队列的当前进度
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, reviewDate, currentIndex } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const date = reviewDate || new Date().toISOString().split('T')[0];

    const { error } = await supabase.rpc('update_review_queue_progress', {
      p_user_id: userId,
      p_review_date: date,
      p_current_index: currentIndex ?? 0,
    });

    if (error) {
      console.error('Error updating review queue progress:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
