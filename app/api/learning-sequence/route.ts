import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../services/supabase';
import { randomUUID } from 'crypto';

// GET /api/learning-sequence?userId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('user_learning_sequences')
      .select(`
        *,
        word_book:word_books(*)
      `)
      .eq('user_id', userId)
      .order('priority', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error fetching learning sequence:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch learning sequence' },
      { status: 500 }
    );
  }
}

// POST /api/learning-sequence
export async function POST(request: NextRequest) {
  try {
    const { userId, wordBookId, isPrimary = false } = await request.json();

    if (!userId || !wordBookId) {
      return NextResponse.json(
        { error: 'User ID and WordBook ID are required' },
        { status: 400 }
      );
    }

    // 获取当前最大优先级
    const { data: maxPriorityData, error: maxPriorityError } = await supabase
      .from('user_learning_sequences')
      .select('priority')
      .eq('user_id', userId)
      .order('priority', { ascending: false })
      .limit(1);

    // 如果没有数据或出错，默认优先级为 1
    const priority = (maxPriorityData && maxPriorityData.length > 0) 
      ? (maxPriorityData[0].priority || 0) + 1 
      : 1;

    // 如果设为主学，取消其他的主学状态
    if (isPrimary) {
      await supabase
        .from('user_learning_sequences')
        .update({ is_primary: false })
        .eq('user_id', userId)
        .eq('is_primary', true);
    }

    const { data, error } = await supabase
      .from('user_learning_sequences')
      .insert({
        user_id: userId,
        word_book_id: wordBookId,
        is_primary: isPrimary,
        priority
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Wordbook already in learning sequence' },
          { status: 409 }
        );
      }
      throw error;
    }

    // 将单词书中的单词复制到用户的 words 表
    try {
      // 1. 获取单词书中的所有单词
      const { data: bookItems, error: itemsError } = await supabase
        .from('word_book_items')
        .select(`
          *,
          word:words(*)
        `)
        .eq('word_book_id', wordBookId);

      if (itemsError) {
        console.error('Error fetching wordbook items:', itemsError);
      } else if (bookItems && bookItems.length > 0) {
        // 2. 检查用户是否已有这些单词
        const { data: existingWords, error: existingError } = await supabase
          .from('words')
          .select('word')
          .eq('user_id', userId);

        if (existingError) {
          console.error('Error fetching existing words:', existingError);
        } else {
          const existingWordSet = new Set(existingWords?.map(w => w.word.toLowerCase()) || []);

          // 3. 过滤出用户没有的单词
          const newWords = bookItems
            .filter(item => item.word && !existingWordSet.has(item.word.word.toLowerCase()))
            .map(item => ({
              id: randomUUID(),
              user_id: userId,
              word: item.word.word,
              phonetic: item.word.phonetic,
              phonetics: item.word.phonetics || [],
              meanings: item.word.meanings || [],
              tags: item.word.tags || [],
              custom_note: item.word.custom_note,
              interval: 1,
              ease_factor: 2.5,
              review_count: 0,
              next_review_at: Date.now(),
              created_at: Date.now(),
              updated_at: Date.now(),
              quality: 0
            }));

          // 4. 批量插入新单词
          if (newWords.length > 0) {
            const { error: insertError } = await supabase
              .from('words')
              .insert(newWords);

            if (insertError) {
              console.error('Error inserting words:', insertError);
            } else {
              console.log(`Added ${newWords.length} words from wordbook to user's review queue`);
            }
          }
        }
      }
    } catch (wordError) {
      // 单词复制失败不应影响学习序列添加的成功
      console.error('Error copying words from wordbook:', wordError);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error adding to learning sequence:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add to learning sequence' },
      { status: 500 }
    );
  }
}

// DELETE /api/learning-sequence?userId=xxx&wordBookId=xxx
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const wordBookId = searchParams.get('wordBookId');

    if (!userId || !wordBookId) {
      return NextResponse.json(
        { error: 'User ID and WordBook ID are required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('user_learning_sequences')
      .delete()
      .eq('user_id', userId)
      .eq('word_book_id', wordBookId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error removing from learning sequence:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove from learning sequence' },
      { status: 500 }
    );
  }
}
