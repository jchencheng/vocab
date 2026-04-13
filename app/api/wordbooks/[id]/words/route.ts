import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../services/supabase';

// 将 dictionary 的 translation 转换为 meanings 格式
function convertTranslationToMeanings(translation: string): any[] {
  if (!translation) return [];
  
  const parts = translation.split(/\n/);
  const meanings: any[] = [];
  
  for (const part of parts) {
    const match = part.match(/^([a-z]+)\.\s*(.+)$/i);
    if (match) {
      meanings.push({
        partOfSpeech: match[1],
        definitions: match[2].split(/[,;]/).map(d => d.trim()).filter(Boolean)
      });
    } else if (part.trim()) {
      meanings.push({
        partOfSpeech: 'general',
        definitions: part.split(/[,;]/).map(d => d.trim()).filter(Boolean)
      });
    }
  }
  
  return meanings;
}

// 将下划线式字段名转换为驼峰式
function mapWordFromDB(dbWord: any, dictData?: any) {
  // 如果有 dictionary 数据，优先使用
  const word = dbWord || {};
  const dict = dictData || {};
  
  // 优先使用 dictionary 的 phonetic 和 translation
  const phonetic = dict.phonetic || word.phonetic;
  const meanings = dict.translation 
    ? convertTranslationToMeanings(dict.translation)
    : (word.meanings || []);
  
  return {
    id: word.id || dict.id,
    word: word.word || dict.word,
    phonetic: phonetic,
    phonetics: word.phonetics || [],
    meanings: meanings,
    tags: word.tags || [],
    customNote: word.custom_note,
    interval: word.interval || 1,
    easeFactor: word.ease_factor || 2.5,
    reviewCount: word.review_count || 0,
    nextReviewAt: word.next_review_at || Date.now(),
    createdAt: word.created_at || Date.now(),
    updatedAt: word.updated_at || Date.now(),
    quality: word.quality || 0,
    sourceType: word.source_type || 'custom',
    sourceWordId: word.source_word_id || null,
  };
}

// GET /api/wordbooks/[id]/words?userId=xxx&status=xxx&page=1&pageSize=20
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // 先获取总数
    let countQuery = supabase
      .from('word_book_items')
      .select('*', { count: 'exact', head: true })
      .eq('word_book_id', params.id);

    if (status) {
      countQuery = countQuery.eq('status', status);
    }

    const { count: total, error: countError } = await countQuery;

    if (countError) throw countError;

    // 获取单词列表（支持 word 和 dictionary 两种 source_type）
    let query = supabase
      .from('word_book_items')
      .select(`
        *,
        word:words(*),
        dictionary:dictionary(*)
      `)
      .eq('word_book_id', params.id);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query
      .order('added_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) throw error;

    // 转换单词数据格式（支持 dictionary 数据）
    const words = data?.map((item: any) => {
      if (item.source_type === 'dictionary' && item.dictionary) {
        // 使用 dictionary 数据
        return mapWordFromDB(null, item.dictionary);
      } else {
        // 使用 words 表数据
        return mapWordFromDB(item.word, null);
      }
    }) || [];

    return NextResponse.json({
      words,
      total: total || 0,
      page,
      pageSize
    });
  } catch (error: any) {
    console.error('Error fetching wordbook words:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch wordbook words' },
      { status: 500 }
    );
  }
}
