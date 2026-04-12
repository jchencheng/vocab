import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../services/supabase';

// POST /api/wordbooks/[id]/reset
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // 更新该单词书所有条目状态为 learning
    const { error } = await supabase
      .from('word_book_items')
      .update({
        status: 'learning',
        mastered_at: null
      })
      .eq('word_book_id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error resetting wordbook:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reset wordbook' },
      { status: 500 }
    );
  }
}
