import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../services/supabase';

// 将下划线式字段名转换为驼峰式
function mapWordFromDB(dbWord: any) {
  return {
    id: dbWord.id,
    word: dbWord.word,
    phonetic: dbWord.phonetic,
    phonetics: dbWord.phonetics || [],
    meanings: dbWord.meanings || [],
    tags: dbWord.tags || [],
    customNote: dbWord.custom_note,
    interval: dbWord.interval || 1,
    easeFactor: dbWord.ease_factor || 2.5,
    reviewCount: dbWord.review_count || 0,
    nextReviewAt: dbWord.next_review_at || Date.now(),
    createdAt: dbWord.created_at || Date.now(),
    updatedAt: dbWord.updated_at || Date.now(),
    quality: dbWord.quality || 0,
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

    // 获取单词列表
    let query = supabase
      .from('word_book_items')
      .select(`
        *,
        word:words(*)
      `)
      .eq('word_book_id', params.id);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query
      .order('added_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) throw error;

    // 转换单词数据格式
    const words = data?.map((item: any) => mapWordFromDB(item.word)) || [];

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
