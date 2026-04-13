import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../services/supabase';

/**
 * GET /api/words/review/count?userId=xxx&maxDailyReviews=50
 * 
 * 获取用户今天需要复习的单词数量（受 maxDailyReviews 限制）
 * 使用数据库函数 get_due_today_count 进行高效计数
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const maxDailyReviews = parseInt(searchParams.get('maxDailyReviews') || '50', 10);

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
      const result = await fallbackGetDueTodayCount(userId, now);
      // 限制为 maxDailyReviews
      const response = await result.json();
      return NextResponse.json({ count: Math.min(response.count || 0, maxDailyReviews) });
    }

    // 限制为 maxDailyReviews
    const limitedCount = Math.min(count || 0, maxDailyReviews);
    return NextResponse.json({ count: limitedCount });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * 备用方案：使用多次查询计算 Due Today 数量
 * 支持 dictionary 数据和 is_excluded 标记
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

    // 2. 获取这些单词书中的所有条目（支持 word 和 dictionary 两种 source_type）
    let allItems: { word_id?: string; dictionary_id?: string; source_type: string }[] = [];
    for (const bookId of wordBookIds) {
      let page = 0;
      const pageSize = 1000;
      
      while (true) {
        const { data: items, error: itemsError } = await supabase
          .from('word_book_items')
          .select('word_id, dictionary_id, source_type')
          .eq('word_book_id', bookId)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (itemsError || !items || items.length === 0) break;
        
        allItems = allItems.concat(items);
        
        if (items.length < pageSize) break;
        page++;
      }
    }

    if (allItems.length === 0) {
      return NextResponse.json({ count: 0 });
    }

    // 分离 word_id 和 dictionary_id
    const wordIds = allItems
      .filter(item => item.source_type === 'word' || !item.source_type)
      .map(item => item.word_id)
      .filter(Boolean) as string[];
    
    const dictionaryIds = allItems
      .filter(item => item.source_type === 'dictionary')
      .map(item => item.dictionary_id)
      .filter(Boolean) as string[];

    // 合并所有单词ID用于查询进度
    const allWordIdsForProgress = [...wordIds, ...dictionaryIds];

    // 3. 获取所有进度记录（排除 is_excluded = true 的）
    const { data: progressRecords, error: progressError } = await supabase
      .from('user_word_progress')
      .select('word_id, interval, next_review_at, is_excluded')
      .eq('user_id', userId)
      .in('word_id', allWordIdsForProgress.slice(0, 1000))
      .or('is_excluded.is.null,is_excluded.eq.false');

    if (progressError) {
      console.error('Error fetching progress records:', progressError);
      return NextResponse.json({ error: progressError.message }, { status: 500 });
    }

    // 4. 计算需要复习的单词数量
    const progressMap = new Map();
    (progressRecords || []).forEach((p: any) => {
      progressMap.set(p.word_id, p);
    });

    let dueCount = 0;

    for (const wordId of allWordIdsForProgress) {
      const progress = progressMap.get(wordId);

      if (!progress) {
        // 没有进度记录（新单词），需要复习
        dueCount++;
      } else {
        const nextReviewAt = progress.next_review_at;
        const interval = progress.interval || 0;

        // 检查是否需要复习
        if (interval === 0 && nextReviewAt > now) {
          // 新单词但设置了未来时间，立即可复习
          dueCount++;
        } else if (nextReviewAt <= now) {
          // 到期复习
          dueCount++;
        }
      }
    }

    console.log(`Fallback: Due today count = ${dueCount} (total items: ${allItems.length}, words: ${wordIds.length}, dictionary: ${dictionaryIds.length})`);
    return NextResponse.json({ count: dueCount });
  } catch (error: any) {
    console.error('Fallback error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
