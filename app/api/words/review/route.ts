import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../services/supabase';

// 轻量级单词类型（用于复习）
interface WordForReview {
  id: string;
  word: string;
  phonetic?: string;
  chineseDefinition: string;
  interval: number;
  easeFactor: number;
  reviewCount: number;
  nextReviewAt: number;
  quality: number;
}

/**
 * GET /api/words/review?userId=xxx&limit=100
 * 
 * 使用单查询 JOIN 获取用户需要复习的单词
 * 优化点：
 * 1. 单次查询获取所有数据（使用 JOIN）
 * 2. 只返回轻量级字段（减少数据传输）
 * 3. 数据库端过滤（只返回 next_review_at <= now 的单词）
 * 4. 数据库端排序和限制
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const limit = parseInt(searchParams.get('limit') || '100', 10);

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    const now = Date.now();

    // 使用 Supabase 的 rpc 调用自定义 SQL 函数
    // 或者使用原始查询
    const { data: words, error } = await supabase.rpc('get_words_for_review', {
      p_user_id: userId,
      p_now: now,
      p_limit: limit
    });

    if (error) {
      console.error('Error fetching review words:', error);
      
      // 如果 RPC 不存在，使用备用方案（多次查询）
      return await fallbackGetReviewWords(userId, now, limit);
    }

    // 转换下划线命名为驼峰命名
    const convertedWords: WordForReview[] = (words || []).map((w: any) => ({
      id: w.id,
      word: w.word,
      phonetic: w.phonetic,
      chineseDefinition: w.chinese_definition || '',
      interval: w.interval || 0,
      easeFactor: w.ease_factor || 2.5,
      reviewCount: w.review_count || 0,
      nextReviewAt: w.next_review_at || now,
      quality: w.quality || 0,
    }));

    console.log(`Fetched ${convertedWords.length} words for review (user: ${userId})`);
    return NextResponse.json(convertedWords);
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * 备用方案：使用多次查询（当 RPC 不存在时）
 */
async function fallbackGetReviewWords(userId: string, now: number, limit: number) {
  console.log('Using fallback method to fetch review words');

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
      return NextResponse.json([]);
    }

    const wordBookIds = learningSequences.map(seq => seq.word_book_id);

    // 2. 获取这些单词书中的所有单词ID（分批）
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
      return NextResponse.json([]);
    }

    // 3. 获取单词详情和进度记录（只获取必要的字段）
    const { data: words, error: wordsError } = await supabase
      .from('words')
      .select(`
        id,
        word,
        phonetic,
        meanings,
        user_word_progress!inner(
          interval,
          ease_factor,
          review_count,
          next_review_at,
          quality
        )
      `)
      .in('id', allWordIds.slice(0, 1000)) // 限制查询数量
      .eq('user_word_progress.user_id', userId)
      .lte('user_word_progress.next_review_at', now)
      .order('user_word_progress.next_review_at', { ascending: true })
      .limit(limit);

    if (wordsError) {
      console.error('Error fetching words:', wordsError);
      return NextResponse.json({ error: wordsError.message }, { status: 500 });
    }

    // 4. 转换为轻量级格式
    const wordsForReview: WordForReview[] = (words || []).map((w: any) => ({
      id: w.id,
      word: w.word,
      phonetic: w.phonetic,
      chineseDefinition: extractChineseDefinition(w.meanings),
      interval: w.user_word_progress?.[0]?.interval || 0,
      easeFactor: w.user_word_progress?.[0]?.ease_factor || 2.5,
      reviewCount: w.user_word_progress?.[0]?.review_count || 0,
      nextReviewAt: w.user_word_progress?.[0]?.next_review_at || now,
      quality: w.user_word_progress?.[0]?.quality || 0,
    }));

    console.log(`Fallback: Fetched ${wordsForReview.length} words for review`);
    return NextResponse.json(wordsForReview);
  } catch (error: any) {
    console.error('Fallback error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * 从 meanings 中提取第一个中文释义
 */
function extractChineseDefinition(meanings: any[]): string {
  if (!meanings || meanings.length === 0) return '';
  
  const firstMeaning = meanings[0];
  if (!firstMeaning?.definitions || firstMeaning.definitions.length === 0) {
    return '';
  }
  
  return firstMeaning.definitions[0]?.chineseDefinition || 
         firstMeaning.definitions[0]?.definition || 
         '';
}
