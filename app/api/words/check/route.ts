import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../services/supabase';

// GET /api/words/check?word=xxx&userId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const word = searchParams.get('word');
    const userId = searchParams.get('userId');

    if (!word || !userId) {
      return NextResponse.json(
        { error: 'Word and userId are required' },
        { status: 400 }
      );
    }

    const normalizedWord = word.trim().toLowerCase();

    // 1. 检查用户是否已添加
    const { data: userWord } = await supabase
      .from('words')
      .select('*')
      .eq('user_id', userId)
      .ilike('word', normalizedWord)
      .single();

    // 2. 检查系统单词书
    const { data: builtinWord } = await supabase
      .from('words')
      .select('*')
      .is('user_id', null)
      .ilike('word', normalizedWord)
      .single();

    return NextResponse.json({
      existsInUserLibrary: !!userWord,
      existsInBuiltin: !!builtinWord,
      userWord,
      builtinWord,
    });
  } catch (error: any) {
    console.error('Error checking word:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check word' },
      { status: 500 }
    );
  }
}
