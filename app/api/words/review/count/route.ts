import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../services/supabase';

/**
 * GET /api/words/review/count?userId=xxx
 * 
 * 获取用户今天需要复习的单词数量
 * 使用数据库函数 get_due_today_count 进行高效计数
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    const now = Date.now();

    // 尝试使用 RPC 调用数据库函数
    const { data: count, error } = await supabase.rpc('get_due_today_count', {
      p_user_id: userId,
      p_now: now,
    });

    if (error) {
      console.error('Error fetching due today count:', error);
      // 如果 RPC 不存在，使用备用方案
      return await fallbackGetDueTodayCount(userId, now);
    }

    return NextResponse.json({ count: count || 0 });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * 备用方案：使用多次查询计算 Due Today 数量
 */
async function fallbackGetDueTodayCount(userId: string, now: number) {
  console.log('Using fallback method to calculate due today count');

  try {
    // 1. 获取用户学习序列中的单词书ID
    const { data: learningSequences, error: seqError } = await supabase
      .from('user_learning_sequences')
      .select('word_book_id')
      .eq('user_id', userId);

    if (seqError) {
      console.error('Error fetching learning sequences:', seqError);
      return NextResponse.json({ error: seqError.message }, { status: 500 });
    }

    if (!learningSequences || learningSequences.length === 0) {
      return NextResponse.json({ count: 0 });
    }

    const wordBookIds = learningSequences.map(seq => seq.word_book_id);

    // 2. 获取这些单词书中的所有单词ID
    let allWordIds: string[] = [];
    for (const bookId of wordBookIds) {
      let page = 0;
      const pageSize = 1000;
      
      while (true) {
        const { data: items, error: itemsError } = await supabase
          .from('word_book_items')
          .select('word_id')
          .eq('word_book_id', bookId)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (itemsError || !items || items.length === 0) break;
        
        allWordIds = allWordIds.concat(items.map(item => item.word_id));
        
        if (items.length < pageSize) break;
        page++;
      }
    }

    if (allWordIds.length === 0) {
      return NextResponse.json({ count: 0 });
    }

    // 3. 统计需要复习的单词数量
    // 包括：没有进度记录的单词、interval=0 且 next_review_at > now 的单词、next_review_at <= now 的单词
    const { count, error: countError } = await supabase
      .from('user_word_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('word_id', allWordIds.slice(0, 1000))
      .lte('next_review_at', now);

    if (countError) {
      console.error('Error counting due words:', countError);
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    // 4. 还需要统计没有进度记录的新单词
    const { data: wordsWithProgress, error: progressError } = await supabase
      .from('user_word_progress')
      .select('word_id')
      .eq('user_id', userId)
      .in('word_id', allWordIds.slice(0, 1000));

    if (progressError) {
      console.error('Error fetching words with progress:', progressError);
      return NextResponse.json({ error: progressError.message }, { status: 500 });
    }

    const wordsWithProgressIds = new Set(wordsWithProgress?.map(p => p.word_id) || []);
    const newWordsCount = allWordIds.filter(id => !wordsWithProgressIds.has(id)).length;

    const totalDue = (count || 0) + newWordsCount;

    console.log(`Fallback: Due today count = ${totalDue} (existing: ${count}, new: ${newWordsCount})`);
    return NextResponse.json({ count: totalDue });
  } catch (error: any) {
    console.error('Fallback error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
