import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../services/supabase';

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
// 添加单词书到学习序列，并为该用户创建单词进度记录
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

    // 为单词书中的每个单词创建用户进度记录
    try {
      // 1. 获取单词书中的所有单词ID（分批获取，避免Supabase限制）
      let allBookItems: any[] = [];
      let page = 0;
      const pageSize = 1000;
      
      while (true) {
        const { data: bookItems, error: itemsError } = await supabase
          .from('word_book_items')
          .select('word_id')
          .eq('word_book_id', wordBookId)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (itemsError) {
          console.error('Error fetching wordbook items:', itemsError);
          break;
        }
        
        if (!bookItems || bookItems.length === 0) {
          break;
        }
        
        allBookItems = allBookItems.concat(bookItems);
        
        if (bookItems.length < pageSize) {
          break;
        }
        page++;
      }

      console.log(`Found ${allBookItems.length} words in wordbook ${wordBookId}`);

      if (allBookItems.length > 0) {
        const wordIds = allBookItems.map(item => item.word_id);

        // 2. 检查用户已有哪些单词的进度记录
        // 使用 upsert 避免重复键问题，不需要预先查询
        console.log(`Preparing ${wordIds.length} progress records for user ${userId}`);

        // 3. 准备所有进度记录（使用 upsert 会自动跳过已存在的）
        const progressRecords = wordIds.map(wordId => ({
          user_id: userId,
          word_id: wordId,
          interval: 0,
          review_count: 0,
          ease_factor: 2.5,
          next_review_at: Date.now(), // 新单词立即可复习
          quality: 0
        }));

        // 4. 批量 upsert 进度记录（分批处理，每批1000个）
        let successCount = 0;
        let errorCount = 0;
        
        if (progressRecords.length > 0) {
          for (let i = 0; i < progressRecords.length; i += 1000) {
            const batch = progressRecords.slice(i, i + 1000);
            const { error: upsertError } = await supabase
              .from('user_word_progress')
              .upsert(batch, {
                onConflict: 'user_id,word_id',
                ignoreDuplicates: true // 忽略重复键，不更新已有记录
              });

            if (upsertError) {
              console.error(`Error upserting word progress batch ${i/1000 + 1}:`, upsertError);
              errorCount += batch.length;
            } else {
              successCount += batch.length;
              console.log(`Upserted batch ${i/1000 + 1} (${batch.length} records)`);
            }
          }
          console.log(`Total: ${successCount} progress records processed, ${errorCount} errors for user ${userId}`);
        }
      }
    } catch (progressError) {
      // 进度记录创建失败不应影响学习序列添加的成功
      console.error('Error creating word progress:', progressError);
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
// 移除单词书 from 学习序列，并删除对应的单词进度记录
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

    // 1. 删除学习序列记录
    const { error } = await supabase
      .from('user_learning_sequences')
      .delete()
      .eq('user_id', userId)
      .eq('word_book_id', wordBookId);

    if (error) throw error;

    // 2. 删除该单词书对应的单词进度记录
    try {
      // 获取单词书中的所有单词ID
      const { data: bookItems, error: itemsError } = await supabase
        .from('word_book_items')
        .select('word_id')
        .eq('word_book_id', wordBookId);

      if (itemsError) {
        console.error('Error fetching wordbook items:', itemsError);
      } else if (bookItems && bookItems.length > 0) {
        const wordIds = bookItems.map(item => item.word_id);

        // 删除这些单词的进度记录
        const { error: deleteError } = await supabase
          .from('user_word_progress')
          .delete()
          .eq('user_id', userId)
          .in('word_id', wordIds);

        if (deleteError) {
          console.error('Error deleting word progress:', deleteError);
        } else {
          console.log(`Deleted progress records for wordbook ${wordBookId}, user ${userId}`);
        }
      }
    } catch (progressError) {
      // 进度记录删除失败不应影响学习序列移除的成功
      console.error('Error deleting word progress:', progressError);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error removing from learning sequence:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove from learning sequence' },
      { status: 500 }
    );
  }
}
