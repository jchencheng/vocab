import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://bmvtpdofmnbrymosrwhy.supabase.co';
const supabaseKey = process.env.SUPABASE_SECRET_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'vocab_app' },
  auth: { autoRefreshToken: false, persistSession: false }
});

// GET /api/contexts?userId=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('contexts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching contexts:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/contexts
export async function POST(request: NextRequest) {
  try {
    const { context, userId } = await request.json();

    if (!context || !userId) {
      return NextResponse.json({ error: 'context and userId are required' }, { status: 400 });
    }

    const dbContext = {
      id: context.id,
      user_id: userId,
      content: context.content,
      word_ids: context.wordIds,
      created_at: context.createdAt,
    };

    const { error } = await supabase.from('contexts').insert(dbContext);

    if (error) {
      console.error('Error adding context:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/contexts
export async function PUT(request: NextRequest) {
  try {
    const { context, userId } = await request.json();

    if (!context || !userId) {
      return NextResponse.json({ error: 'context and userId are required' }, { status: 400 });
    }

    const dbContext = {
      content: context.content,
      word_ids: context.wordIds,
    };

    const { error } = await supabase
      .from('contexts')
      .update(dbContext)
      .eq('id', context.id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating context:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/contexts?contextId=xxx&userId=xxx
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const contextId = searchParams.get('contextId');
  const userId = searchParams.get('userId');

  if (!contextId || !userId) {
    return NextResponse.json({ error: 'contextId and userId are required' }, { status: 400 });
  }

  try {
    const { error } = await supabase
      .from('contexts')
      .delete()
      .eq('id', contextId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting context:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
