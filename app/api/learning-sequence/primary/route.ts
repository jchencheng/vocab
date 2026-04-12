import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../services/supabase';

// PUT /api/learning-sequence/primary
export async function PUT(request: NextRequest) {
  try {
    const { userId, wordBookId } = await request.json();

    if (!userId || !wordBookId) {
      return NextResponse.json(
        { error: 'User ID and WordBook ID are required' },
        { status: 400 }
      );
    }

    // 先取消所有主学状态
    await supabase
      .from('user_learning_sequences')
      .update({ is_primary: false })
      .eq('user_id', userId)
      .eq('is_primary', true);

    // 设置新的主学单词书
    const { data, error } = await supabase
      .from('user_learning_sequences')
      .update({ is_primary: true })
      .eq('user_id', userId)
      .eq('word_book_id', wordBookId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error setting primary wordbook:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to set primary wordbook' },
      { status: 500 }
    );
  }
}
