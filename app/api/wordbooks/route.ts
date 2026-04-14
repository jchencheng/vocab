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

    // 获取所有需要统计的单词书ID（系统书 + 学习序列中的书 + 自定义书）
    const allBookIds = [
      ...(systemBooks?.map((b: any) => b.id) || []),
      ...(learningSequence?.map((item: any) => item.word_book?.id || item.word_book_id) || []),
      ...(customBooks?.map((b: any) => b.id) || [])
    ].filter(Boolean);

    // 去重
    const uniqueBookIds = [...new Set(allBookIds)];

    const stats: Record<string, any> = {};
    
    // 使用数据库函数获取统计，避免 1000 条查询限制
    if (uniqueBookIds.length > 0) {
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_wordbook_stats', { book_ids: uniqueBookIds });

      if (!statsError && statsData) {
        for (const row of statsData) {
          const total = Number(row.total);
          const mastered = Number(row.mastered);
          stats[row.word_book_id] = {
            total,
            mastered,
            learning: Number(row.learning),
            ignored: Number(row.ignored),
            new: Number(row.new_words),
            progress: total > 0 ? Math.round((mastered / total) * 100) : 0
          };
        }
      }
      
      // 为没有统计的书填充默认值
      for (const bookId of uniqueBookIds) {
        if (!stats[bookId]) {
          stats[bookId] = {
            total: 0,
            mastered: 0,
            learning: 0,
            ignored: 0,
            new: 0,
            progress: 0
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
