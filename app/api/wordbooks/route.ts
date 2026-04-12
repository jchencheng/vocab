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
    // 获取系统预置单词书
    const { data: systemBooks, error: systemError } = await supabase
      .from('word_books')
      .select('*')
      .is('user_id', null)
      .eq('is_active', true);

    if (systemError) throw systemError;

    // 获取用户学习序列
    const { data: learningSequence, error: sequenceError } = await supabase
      .from('user_learning_sequences')
      .select(`
        *,
        word_book:word_books(*)
      `)
      .eq('user_id', userId);

    if (sequenceError) throw sequenceError;

    // 获取用户自建单词书（不在学习序列中的）
    const { data: customBooks, error: customError } = await supabase
      .from('word_books')
      .select('*')
      .eq('user_id', userId)
      .eq('source_type', 'custom');

    if (customError) throw customError;

    return NextResponse.json({
      systemBooks: systemBooks || [],
      learningSequence: learningSequence || [],
      customBooks: customBooks || []
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
