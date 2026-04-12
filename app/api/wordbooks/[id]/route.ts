import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../services/supabase';

// GET /api/wordbooks/[id]?userId=xxx
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // 获取单词书信息
    const { data: book, error: bookError } = await supabase
      .from('word_books')
      .select('*')
      .eq('id', params.id)
      .single();

    if (bookError || !book) {
      return NextResponse.json(
        { error: 'Wordbook not found' },
        { status: 404 }
      );
    }

    // 获取统计信息
    const { data: stats, error: statsError } = await supabase
      .from('word_book_items')
      .select('status')
      .eq('word_book_id', params.id);

    if (statsError) throw statsError;

    const total = stats?.length || 0;
    const mastered = stats?.filter((s: any) => s.status === 'mastered').length || 0;
    const learning = stats?.filter((s: any) => s.status === 'learning').length || 0;
    const ignored = stats?.filter((s: any) => s.status === 'ignored').length || 0;

    // 检查是否在学习序列中
    let inSequence = false;
    let isPrimary = false;
    if (userId) {
      const { data: sequence } = await supabase
        .from('user_learning_sequences')
        .select('*')
        .eq('user_id', userId)
        .eq('word_book_id', params.id)
        .single();
      inSequence = !!sequence;
      isPrimary = sequence?.is_primary || false;
    }

    return NextResponse.json({
      ...book,
      stats: {
        total,
        mastered,
        learning,
        ignored,
        progress: total > 0 ? Math.round((mastered / total) * 100) : 0
      },
      inSequence,
      isPrimary
    });
  } catch (error: any) {
    console.error('Error fetching wordbook:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch wordbook' },
      { status: 500 }
    );
  }
}

// DELETE /api/wordbooks/[id]?userId=xxx
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // 检查是否是自定义单词书
    const { data: book } = await supabase
      .from('word_books')
      .select('source_type')
      .eq('id', params.id)
      .single();

    if (!book || book.source_type !== 'custom') {
      return NextResponse.json(
        { error: 'Cannot delete system wordbook' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('word_books')
      .delete()
      .eq('id', params.id)
      .eq('user_id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting wordbook:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete wordbook' },
      { status: 500 }
    );
  }
}
