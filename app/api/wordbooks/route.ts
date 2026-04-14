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
      // 获取系统预置单词书（包含计数字段）
      supabase
        .from('word_books')
        .select('*, word_count, mastered_count, learning_count, new_count')
        .is('user_id', null)
        .eq('is_active', true),
      
      // 获取用户学习序列（包含计数字段）
      supabase
        .from('user_learning_sequences')
        .select(`
          *,
          word_book:word_books(*, word_count, mastered_count, learning_count, new_count)
        `)
        .eq('user_id', userId),
      
      // 获取用户自建单词书（包含计数字段）
      supabase
        .from('word_books')
        .select('*, word_count, mastered_count, learning_count, new_count')
        .eq('user_id', userId)
        .eq('source_type', 'custom')
    ]);

    if (systemError) throw systemError;
    if (sequenceError) throw sequenceError;
    if (customError) throw customError;

    // 构建 stats 对象（从 word_books 表的计数字段读取）
    const stats: Record<string, any> = {};
    
    // 辅助函数：从 book 对象构建 stats
    const buildStats = (book: any) => {
      const total = book.word_count || 0;
      const mastered = book.mastered_count || 0;
      return {
        total,
        mastered,
        learning: book.learning_count || 0,
        ignored: book.ignored_count || 0,
        new: book.new_count || 0,
        progress: total > 0 ? Math.round((mastered / total) * 100) : 0
      };
    };
    
    // 从 systemBooks 构建 stats
    for (const book of (systemBooks || [])) {
      stats[book.id] = buildStats(book);
    }
    
    // 从 customBooks 构建 stats
    for (const book of (customBooks || [])) {
      stats[book.id] = buildStats(book);
    }
    
    // 从 learningSequence 中的 word_book 构建 stats（包含自定义单词书）
    for (const item of (learningSequence || [])) {
      const book = item.word_book;
      if (book && !stats[book.id]) {
        stats[book.id] = buildStats(book);
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
        word_count: 0,
        mastered_count: 0,
        learning_count: 0,
        new_count: 0
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
