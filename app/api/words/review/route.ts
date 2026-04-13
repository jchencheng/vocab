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
 * 支持 dictionary 数据
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
      return NextResponse.json([]);
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

    // 3. 获取 words 表的单词详情
    let wordDetails: any[] = [];
    if (wordIds.length > 0) {
      const { data: words, error: wordsError } = await supabase
        .from('words')
        .select(`
          id,
          word,
          phonetic,
          meanings
        `)
        .in('id', wordIds.slice(0, 1000));

      if (wordsError) {
        console.error('Error fetching words:', wordsError);
      } else {
        wordDetails = words || [];
      }
    }

    // 4. 获取 dictionary 表的单词详情
    let dictDetails: any[] = [];
    if (dictionaryIds.length > 0) {
      const { data: dicts, error: dictError } = await supabase
        .from('dictionary')
        .select('id, word, phonetic, translation')
        .in('id', dictionaryIds.slice(0, 1000));

      if (dictError) {
        console.error('Error fetching dictionary:', dictError);
      } else {
        dictDetails = dicts || [];
      }
    }

    // 5. 合并所有单词ID用于查询进度
    const allWordIdsForProgress = [
      ...wordIds,
      ...dictionaryIds  // dictionary_id 也作为 word_id 存储在进度表中
    ];

    // 6. 获取进度记录（排除 is_excluded = true 的）
    const { data: progressRecords, error: progressError } = await supabase
      .from('user_word_progress')
      .select('word_id, interval, ease_factor, review_count, next_review_at, quality, is_excluded')
      .eq('user_id', userId)
      .in('word_id', allWordIdsForProgress.slice(0, 1000))
      .or('is_excluded.is.null,is_excluded.eq.false');

    if (progressError) {
      console.error('Error fetching progress:', progressError);
    }

    const progressMap = new Map();
    (progressRecords || []).forEach((p: any) => {
      progressMap.set(p.word_id, p);
    });

    // 7. 合并数据并过滤出需要复习的单词
    const wordsForReview: WordForReview[] = [];

    // 处理 words 表的单词
    for (const w of wordDetails) {
      const progress = progressMap.get(w.id);
      const nextReviewAt = progress?.next_review_at || now;
      const interval = progress?.interval || 0;
      const isExcluded = progress?.is_excluded || false;

      // 排除已标记为排除的单词
      if (isExcluded) continue;

      // 检查是否需要复习
      const needsReview = !progress || 
        (interval === 0 && nextReviewAt > now) || 
        nextReviewAt <= now;

      if (needsReview) {
        wordsForReview.push({
          id: w.id,
          word: w.word,
          phonetic: w.phonetic,
          chineseDefinition: extractChineseDefinition(w.meanings),
          interval: interval,
          easeFactor: progress?.ease_factor || 2.5,
          reviewCount: progress?.review_count || 0,
          nextReviewAt: interval === 0 && nextReviewAt > now ? now : nextReviewAt,
          quality: progress?.quality || 0,
        });
      }
    }

    // 处理 dictionary 表的单词
    for (const d of dictDetails) {
      const progress = progressMap.get(d.id);
      const nextReviewAt = progress?.next_review_at || now;
      const interval = progress?.interval || 0;
      const isExcluded = progress?.is_excluded || false;

      // 排除已标记为排除的单词
      if (isExcluded) continue;

      // 检查是否需要复习
      const needsReview = !progress || 
        (interval === 0 && nextReviewAt > now) || 
        nextReviewAt <= now;

      if (needsReview) {
        wordsForReview.push({
          id: d.id,
          word: d.word,
          phonetic: d.phonetic,
          chineseDefinition: d.translation || '',
          interval: interval,
          easeFactor: progress?.ease_factor || 2.5,
          reviewCount: progress?.review_count || 0,
          nextReviewAt: interval === 0 && nextReviewAt > now ? now : nextReviewAt,
          quality: progress?.quality || 0,
        });
      }
    }

    // 8. 排序并限制数量
    // 优先返回 interval=0 的单词（新单词），然后按 next_review_at 排序
    wordsForReview.sort((a, b) => {
      const aIsNew = a.interval === 0 ? 0 : 1;
      const bIsNew = b.interval === 0 ? 0 : 1;
      if (aIsNew !== bIsNew) return aIsNew - bIsNew;
      return a.nextReviewAt - b.nextReviewAt;
    });

    const limitedWords = wordsForReview.slice(0, limit);

    console.log(`Fallback: Fetched ${limitedWords.length} words for review (${wordDetails.length} from words, ${dictDetails.length} from dictionary)`);
    return NextResponse.json(limitedWords);
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
