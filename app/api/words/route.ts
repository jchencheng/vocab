import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../services/supabase';

// 将驼峰式字段名转换为下划线式
function mapWordToDB(word: any) {
  return {
    id: word.id,
    word: word.word,
    phonetic: word.phonetic || null,
    phonetics: word.phonetics || [],
    meanings: word.meanings || [],
    tags: word.tags || [],
    custom_note: word.customNote || null,
    interval: word.interval || 1,
    ease_factor: word.easeFactor || 2.5,
    review_count: word.reviewCount || 0,
    next_review_at: word.nextReviewAt || Date.now(),
    created_at: word.createdAt || Date.now(),
    updated_at: word.updatedAt || Date.now(),
    quality: word.quality || 0,
  };
}

// GET /api/words?userId=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('words')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching words:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/words
export async function POST(request: NextRequest) {
  try {
    const { word, userId } = await request.json();

    if (!word || !userId) {
      return NextResponse.json({ error: 'word and userId are required' }, { status: 400 });
    }

    const dbWord = mapWordToDB(word);

    const { error } = await supabase
      .from('words')
      .insert({ ...dbWord, user_id: userId });

    if (error) {
      console.error('Error adding word:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/words
export async function PUT(request: NextRequest) {
  try {
    const { word, userId } = await request.json();

    if (!word || !userId) {
      return NextResponse.json({ error: 'word and userId are required' }, { status: 400 });
    }

    const dbWord = mapWordToDB(word);

    const { error } = await supabase
      .from('words')
      .update({ ...dbWord, user_id: userId })
      .eq('id', word.id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating word:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/words?wordId=xxx&userId=xxx
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const wordId = searchParams.get('wordId');
  const userId = searchParams.get('userId');

  if (!wordId || !userId) {
    return NextResponse.json({ error: 'wordId and userId are required' }, { status: 400 });
  }

  try {
    const { error } = await supabase
      .from('words')
      .delete()
      .eq('id', wordId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting word:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
