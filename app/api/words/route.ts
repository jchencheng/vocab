import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../services/supabase';

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

    const { error } = await supabase
      .from('words')
      .insert({ ...word, user_id: userId });

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

    const { error } = await supabase
      .from('words')
      .update({ ...word, user_id: userId })
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
