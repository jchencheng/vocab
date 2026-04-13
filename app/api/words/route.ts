import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../services/supabase';
import { randomUUID } from 'crypto';

// 将驼峰式字段名转换为下划线式（用于写入数据库）
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

// 将下划线式字段名转换为驼峰式（用于从数据库读取）
function mapWordFromDB(dbWord: any) {
  return {
    id: dbWord.id,
    word: dbWord.word,
    phonetic: dbWord.phonetic,
    phonetics: dbWord.phonetics || [],
    meanings: dbWord.meanings || [],
    tags: dbWord.tags || [],
    customNote: dbWord.custom_note,
    interval: dbWord.interval || 1,
    easeFactor: dbWord.ease_factor || 2.5,
    reviewCount: dbWord.review_count || 0,
    nextReviewAt: dbWord.next_review_at || Date.now(),
    createdAt: dbWord.created_at || Date.now(),
    updatedAt: dbWord.updated_at || Date.now(),
    quality: dbWord.quality || 0,
  };
}

// GET /api/words?userId=xxx
// 返回用户手动添加的单词 + 用户学习序列中单词书的单词（不重复）
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    // 1. 获取用户手动添加的单词
    const { data: userWords, error: userWordsError } = await supabase
      .from('words')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (userWordsError) {
      console.error('Error fetching user words:', userWordsError);
      return NextResponse.json({ error: userWordsError.message }, { status: 500 });
    }

    // 2. 获取用户学习序列中的单词书ID
    const { data: learningSequences, error: seqError } = await supabase
      .from('user_learning_sequences')
      .select('word_book_id')
      .eq('user_id', userId);

    if (seqError) {
      console.error('Error fetching learning sequences:', seqError);
    }

    // 3. 获取学习序列中单词书的单词（系统单词，user_id 为 null）
    let wordbookWords: any[] = [];
    if (learningSequences && learningSequences.length > 0) {
      const wordBookIds = learningSequences.map(seq => seq.word_book_id);
      
      // 获取这些单词书中的所有单词
      const { data: bookItems, error: itemsError } = await supabase
        .from('word_book_items')
        .select(`
          word:words(*)
        `)
        .in('word_book_id', wordBookIds);

      if (itemsError) {
        console.error('Error fetching wordbook items:', itemsError);
      } else if (bookItems) {
        wordbookWords = bookItems
          .map((item: any) => item.word)
          .filter((word: any) => word !== null);
      }
    }

    // 4. 合并单词，以用户手动添加的为准（去重）
    const userWordSet = new Set(userWords?.map(w => w.word.toLowerCase()) || []);
    
    // 过滤掉用户已手动添加的单词书单词
    const uniqueWordbookWords = wordbookWords.filter(
      (word: any) => !userWordSet.has(word.word.toLowerCase())
    );

    // 5. 合并并转换格式
    const allWords = [
      ...(userWords || []),
      ...uniqueWordbookWords
    ];

    const words = allWords.map(mapWordFromDB);
    return NextResponse.json(words);
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/words
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { word, userId, useBuiltinMeanings, originalWordId } = body;

    if (!word || !userId) {
      return NextResponse.json({ error: 'word and userId are required' }, { status: 400 });
    }

    // 检查用户是否已添加过该单词
    const { data: existingWord, error: checkError } = await supabase
      .from('words')
      .select('*')
      .eq('user_id', userId)
      .ilike('word', word.word.trim())
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing word:', checkError);
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    // 如果单词已存在，返回错误
    if (existingWord) {
      return NextResponse.json(
        { error: 'Word already exists in your library', word: mapWordFromDB(existingWord) },
        { status: 409 }
      );
    }

    // 准备单词数据
    const wordData = {
      ...word,
      id: randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const dbWord = mapWordToDB(wordData);

    // 插入单词
    const { data: newWord, error: wordError } = await supabase
      .from('words')
      .insert({ ...dbWord, user_id: userId })
      .select()
      .single();

    if (wordError) {
      console.error('Error adding word:', wordError);
      return NextResponse.json({ error: wordError.message }, { status: 500 });
    }

    // 查找或创建"自定义单词本"
    let { data: customBook } = await supabase
      .from('word_books')
      .select('id')
      .eq('user_id', userId)
      .eq('name', '自定义单词本')
      .single();

    if (!customBook) {
      // 创建自定义单词本
      const { data: newBook, error: bookError } = await supabase
        .from('word_books')
        .insert({
          user_id: userId,
          name: '自定义单词本',
          description: '用户手动添加的单词',
          source_type: 'custom',
          word_count: 0
        })
        .select()
        .single();

      if (bookError) {
        console.error('Error creating custom wordbook:', bookError);
      } else {
        customBook = newBook;
      }
    }

    // 将单词关联到自定义单词本
    if (customBook) {
      await supabase
        .from('word_book_items')
        .insert({
          word_book_id: customBook.id,
          word_id: newWord.id,
          status: 'learning'
        });

      // 更新单词书单词计数
      const { data: countData } = await supabase
        .from('word_book_items')
        .select('id', { count: 'exact' })
        .eq('word_book_id', customBook.id);

      await supabase
        .from('word_books')
        .update({ word_count: countData?.length || 0 })
        .eq('id', customBook.id);
    }

    // 返回添加的单词（使用驼峰式字段名）
    return NextResponse.json(mapWordFromDB(newWord), { status: 201 });
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
