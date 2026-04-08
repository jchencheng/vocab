import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../services/supabase';

// GET /api/settings?userId=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No settings found
        return NextResponse.json(null);
      }
      console.error('Error fetching settings:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/settings
export async function PUT(request: NextRequest) {
  try {
    const { settings, userId } = await request.json();

    if (!settings || !userId) {
      return NextResponse.json({ error: 'settings and userId are required' }, { status: 400 });
    }

    // Try to update first
    const { error: updateError } = await supabase
      .from('settings')
      .update({
        ...settings,
        user_id: userId,
        updated_at: Date.now()
      })
      .eq('user_id', userId);

    if (!updateError) {
      return NextResponse.json({ success: true });
    }

    // If update fails, try insert
    const { error: insertError } = await supabase
      .from('settings')
      .insert({
        ...settings,
        user_id: userId,
        updated_at: Date.now()
      });

    if (insertError) {
      console.error('Error saving settings:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
