import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../services/supabase';

/**
 * POST /api/words/delete-from-review
 * 
 * 从复习队列中删除单词：
 * - 如果是用户添加的词，从 words 表删除
 * - 如果是内置词，在 user_word_progress 表中标记 is_excluded = true
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, wordId } = body;

    if (!userId || !wordId) {
      return NextResponse.json({ error: 'userId and wordId are required' }, { status: 400 });
    }

    // 1. 查询单词信息，判断是用户添加的还是内置词
    const { data: word, error: wordError } = await supabase
      .from('words')
      .select('id, user_id')
      .eq('id', wordId)
      .single();

    if (wordError) {
      console.error('Error fetching word:', wordError);
      return NextResponse.json({ error: wordError.message }, { status: 500 });
    }

    // 2. 判断单词类型并执行相应操作
    if (word.user_id === userId) {
      // 用户添加的词 - 从 words 表删除
      const { error: deleteError } = await supabase
        .from('words')
        .delete()
        .eq('id', wordId)
        .eq('user_id', userId);

      if (deleteError) {
        console.error('Error deleting word:', deleteError);
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: 'deleted' });
    } else {
      // 内置词 - 在 user_word_progress 表中标记 is_excluded
      const now = Date.now();
      
      // 使用 upsert 确保记录存在
      const { error: upsertError } = await supabase
        .from('user_word_progress')
        .upsert({
          user_id: userId,
          word_id: wordId,
          is_excluded: true,
          updated_at: now,
        }, {
          onConflict: 'user_id,word_id'
        });

      if (upsertError) {
        console.error('Error marking word as excluded:', upsertError);
        return NextResponse.json({ error: upsertError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: 'excluded' });
    }
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
