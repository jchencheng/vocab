import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../services/supabase';

// GET /api/wordbooks/[id]/words?status=xxx&page=1&pageSize=50
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');

    let query = supabase
      .from('word_book_items')
      .select(`
        *,
        word:words(*)
      `)
      .eq('word_book_id', params.id);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query
      .order('added_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) throw error;

    return NextResponse.json({
      items: data || [],
      page,
      pageSize
    });
  } catch (error: any) {
    console.error('Error fetching wordbook words:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch wordbook words' },
      { status: 500 }
    );
  }
}
