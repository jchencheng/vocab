import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../services/supabase';

// 将驼峰式字段名转换为下划线式（保存到数据库）
function mapSettingsToDB(settings: any) {
  return {
    max_daily_reviews: settings.maxDailyReviews || 50,
    dark_mode: settings.darkMode || false,
    study_mode: settings.studyMode || 'book-priority',
    primary_word_book_id: settings.primaryWordBookId || null,
    updated_at: Date.now(),
  };
}

// 将下划线式字段名转换为驼峰式（从数据库读取）
function mapSettingsFromDB(data: any) {
  return {
    maxDailyReviews: data.max_daily_reviews || 50,
    darkMode: data.dark_mode || false,
    studyMode: data.study_mode || 'book-priority',
    primaryWordBookId: data.primary_word_book_id || null,
  };
}

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

    return NextResponse.json(mapSettingsFromDB(data));
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

    const dbSettings = mapSettingsToDB(settings);

    // Try to update first
    const { error: updateError } = await supabase
      .from('settings')
      .update({
        ...dbSettings,
        user_id: userId,
      })
      .eq('user_id', userId);

    if (!updateError) {
      return NextResponse.json({ success: true });
    }

    // If update fails, try insert
    const { error: insertError } = await supabase
      .from('settings')
      .insert({
        ...dbSettings,
        user_id: userId,
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
