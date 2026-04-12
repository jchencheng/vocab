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
export async function POST(request: NextRequest) {
  try {
    const { userId, wordBookId, isPrimary = false } = await request.json();

    if (!userId || !wordBookId) {
      return NextResponse.json(
        { error: 'User ID and WordBook ID are required' },
        { status: 400 }
      );
    }

    // 检查用户是否存在于 users 表，如果不存在则创建
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingUser) {
      // 用户不存在，创建新用户
      const { error: createUserError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: `user-${userId}@placeholder.com`,
          created_at: new Date().toISOString()
        });

      if (createUserError) {
        console.error('Error creating user:', createUserError);
        return NextResponse.json(
          { error: 'Failed to create user record' },
          { status: 500 }
        );
      }
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
