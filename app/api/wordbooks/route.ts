import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../services/supabase';

// GET /api/wordbooks?userId=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    // 并行执行所有查询，减少等待时间
    const [
      { data: systemBooks, error: systemError },
      { data: learningSequence, error: sequenceError },
      { data: customBooks, error: customError }
    ] = await Promise.all([
      // 获取系统预置单词书
      supabase
        .from('word_books')
        .select('*')
        .is('user_id', null)
        .eq('is_active', true),
      
      // 获取用户学习序列
      supabase
        .from('user_learning_sequences')
        .select(`
          *,
          word_book:word_books(*)
        `)
        .eq('user_id', userId),
      
      // 获取用户自建单词书
      supabase
        .from('word_books')
        .select('*')
        .eq('user_id', userId)
        .eq('source_type', 'custom')
    ]);

    if (systemError) throw systemError;
    if (sequenceError) throw sequenceError;
    if (customError) throw customError;

    // 获取学习序列中每本书的真实统计
    const bookIds = learningSequence?.map((item: any) => 
      item.word_book?.id || item.word_book_id
    ).filter(Boolean) || [];

    const stats: Record<string, any> = {};
    
    if (bookIds.length > 0) {
      const { data: itemsData, error: itemsError } = await supabase
        .from('word_book_items')
        .select('word_book_id, status')
        .in('word_book_id', bookIds);

      if (!itemsError && itemsData) {
        for (const bookId of bookIds) {
          const bookItems = itemsData.filter((item: any) => item.word_book_id === bookId);
          const total = bookItems.length;
          const mastered = bookItems.filter((item: any) => item.status === 'mastered').length;
          const learning = bookItems.filter((item: any) => item.status === 'learning').length;
          const ignored = bookItems.filter((item: any) => item.status === 'ignored').length;
          
          stats[bookId] = {
            total,
            mastered,
            learning,
            ignored,
            progress: total > 0 ? Math.round((mastered / total) * 100) : 0
          };
        }
      }
    }

    return NextResponse.json({
      systemBooks: systemBooks || [],
      learningSequence: learningSequence || [],
      customBooks: customBooks || [],
      stats
    });
  } catch (error: any) {
    console.error('Error fetching wordbooks:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch wordbooks' },
      { status: 500 }
    );
  }
}

// POST /api/wordbooks
export async function POST(request: NextRequest) {
  try {
    const { userId, name, description, category } = await request.json();

    if (!userId || !name) {
      return NextResponse.json(
        { error: 'User ID and name are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('word_books')
      .insert({
        user_id: userId,
        name,
        description,
        category,
        source_type: 'custom',
        word_count: 0
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error creating wordbook:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create wordbook' },
      { status: 500 }
    );
  }
}
