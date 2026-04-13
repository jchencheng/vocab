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
    source_type: word.source_type || 'custom',
    source_word_id: word.source_word_id || null,
  };
}

// 将下划线式字段名转换为驼峰式（用于从数据库读取）
function mapWordFromDB(dbWord: any, progress?: any): any {
  // 确保 next_review_at 是数字类型
  const getNextReviewAt = () => {
    const now = Date.now();
    // 优先使用进度记录的 next_review_at（如果存在且是有效值）
    if (progress?.next_review_at != null) {
      const val = progress.next_review_at;
      const nextReviewAt = typeof val === 'number' ? val : new Date(val).getTime();
      // 如果复习时间在未来，且间隔为0（新单词），则立即可复习
      // 这样可以修复之前错误设置的进度记录
      const interval = progress?.interval ?? 0;
      if (interval === 0 && nextReviewAt > now) {
        return now;
      }
      return nextReviewAt;
    }
    // 如果没有进度记录，新单词立即可复习
    return now;
  };

  return {
    id: dbWord.id,
    word: dbWord.word,
    phonetic: dbWord.phonetic,
    phonetics: dbWord.phonetics || [],
    meanings: dbWord.meanings || [],
    tags: dbWord.tags || [],
    customNote: dbWord.custom_note,
    // 如果有进度记录，使用进度记录的值；否则使用默认值
    interval: progress?.interval ?? dbWord.interval ?? 1,
    easeFactor: progress?.ease_factor ?? dbWord.ease_factor ?? 2.5,
    reviewCount: progress?.review_count ?? dbWord.review_count ?? 0,
    nextReviewAt: getNextReviewAt(),
    createdAt: dbWord.created_at ?? Date.now(),
    updatedAt: progress?.updated_at ?? dbWord.updated_at ?? Date.now(),
    quality: progress?.quality ?? dbWord.quality ?? 0,
    sourceType: dbWord.source_type || 'custom',
    sourceWordId: dbWord.source_word_id || null,
  };
}

// GET /api/words?userId=xxx
// 返回用户手动添加的单词 + 用户学习序列中单词书的单词（包含复习进度）
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

    // 3. 获取学习序列中单词书的单词
    let wordbookWords: any[] = [];
    let wordbookProgress: Map<string, any> = new Map();
    
    if (learningSequences && learningSequences.length > 0) {
      const wordBookIds = learningSequences.map(seq => seq.word_book_id);
      
      // 获取这些单词书中的所有单词（分批获取）
      let allBookItems: any[] = [];
      for (const bookId of wordBookIds) {
        let page = 0;
        const pageSize = 1000;
        
        while (true) {
          const { data: bookItems, error: itemsError } = await supabase
            .from('word_book_items')
            .select(`
              word_id,
              source_type,
              dictionary_id,
              word:words(*),
              dictionary:dictionary(*)
            `)
            .eq('word_book_id', bookId)
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
      }

      console.log(`Fetched ${allBookItems.length} words from learning sequences`);

      if (allBookItems.length > 0) {
        const wordIds = allBookItems.map((item: any) => item.word_id).filter(Boolean);
        console.log(`Extracted ${wordIds.length} word IDs:`, wordIds.slice(0, 5), '...');
        
        // 处理单词书单词，支持词典词
        wordbookWords = allBookItems
          .map((item: any) => {
            if (item.source_type === 'dictionary' && item.dictionary) {
              // 词典词：使用 dictionary 数据，并标记 sourceType
              return {
                ...item.dictionary,
                id: item.word_id || item.dictionary.id,
                source_type: 'dictionary',
                source_word_id: item.dictionary.id,
              };
            } else if (item.word) {
              // 普通词：使用 words 表数据
              return item.word;
            }
            return null;
          })
          .filter((word: any) => word !== null);
        
        console.log(`After filtering null words: ${wordbookWords.length} words`);

        // 获取该用户的所有进度记录（不分批，一次性获取）
        // 然后过滤出需要的单词进度
        console.log(`Fetching all progress records for user ${userId}`);
        
        try {
          // 获取用户的所有进度记录，然后过滤出需要的单词
          // 使用 range 分批获取所有记录
          let allProgress: any[] = [];
          let page = 0;
          const pageSize = 1000;
          
          while (true) {
            const { data: batchProgress, error: progressError } = await supabase
              .from('user_word_progress')
              .select('*')
              .eq('user_id', userId)
              .range(page * pageSize, (page + 1) * pageSize - 1);

            if (progressError) {
              console.error(`Error fetching progress page ${page + 1}:`, progressError);
              break;
            }
            
            if (!batchProgress || batchProgress.length === 0) {
              break;
            }
            
            allProgress = allProgress.concat(batchProgress);
            
            if (batchProgress.length < pageSize) {
              break;
            }
            page++;
          }
          
          // 过滤出需要的进度记录
          const wordIdSet = new Set(wordIds);
          allProgress.forEach((p: any) => {
            if (wordIdSet.has(p.word_id)) {
              wordbookProgress.set(p.word_id, p);
            }
          });
          
          console.log(`Fetched ${wordbookProgress.size} progress records for user ${userId} (expected ${wordIds.length}, total in db: ${allProgress.length})`);
        } catch (e) {
          console.error('Exception fetching progress:', e);
        }
      }
    }

    // 4. 合并单词，以用户手动添加的为准（去重）
    const userWordSet = new Set(userWords?.map(w => w.word.toLowerCase()) || []);
    
    // 过滤掉用户已手动添加的单词书单词
    const uniqueWordbookWords = wordbookWords.filter(
      (word: any) => !userWordSet.has(word.word.toLowerCase())
    );

    // 5. 合并并转换格式（单词书单词使用进度记录的状态）
    const userWordsMapped = (userWords || []).map(w => mapWordFromDB(w));
    const wordbookWordsMapped = uniqueWordbookWords.map((w: any) => 
      mapWordFromDB(w, wordbookProgress.get(w.id))
    );

    // 调试：检查 next_review_at 值
    const now = Date.now();
    const dueWords = wordbookWordsMapped.filter((w: any) => w.nextReviewAt <= now);
    console.log(`Wordbook words: ${wordbookWordsMapped.length}, due now: ${dueWords.length}`);
    if (wordbookWordsMapped.length > 0) {
      const sample = wordbookWordsMapped[0];
      const sampleWordId = uniqueWordbookWords[0]?.id;
      const sampleProgress = wordbookProgress.get(sampleWordId);
      console.log(`Sample word: ${sampleWordId}`);
      console.log(`  Progress record:`, sampleProgress ? {
        next_review_at: sampleProgress.next_review_at,
        type: typeof sampleProgress.next_review_at
      } : 'No progress record');
      console.log(`  Mapped nextReviewAt: ${sample.nextReviewAt}, now: ${now}, isDue: ${sample.nextReviewAt <= now}`);
    }

    const allWords = [...userWordsMapped, ...wordbookWordsMapped];
    console.log(`Returning ${allWords.length} total words (${userWordsMapped.length} user + ${wordbookWordsMapped.length} wordbook)`);
    return NextResponse.json(allWords);
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// 将 dictionary 的 translation 转换为 meanings 格式
function convertTranslationToMeanings(translation: string): any[] {
  if (!translation) return [];
  
  // 按词性分割，例如 "n. 单词\nv. 说话"
  const parts = translation.split(/\n/);
  const meanings: any[] = [];
  
  for (const part of parts) {
    const match = part.match(/^([a-z]+)\.\s*(.+)$/i);
    if (match) {
      meanings.push({
        partOfSpeech: match[1],
        definitions: match[2].split(/[,;]/).map(d => d.trim()).filter(Boolean)
      });
    } else if (part.trim()) {
      // 没有词性标记的，作为通用释义
      meanings.push({
        partOfSpeech: 'general',
        definitions: part.split(/[,;]/).map(d => d.trim()).filter(Boolean)
      });
    }
  }
  
  return meanings;
}

// POST /api/words
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { word, userId, useBuiltinMeanings, originalWordId } = body;

    if (!word || !userId) {
      return NextResponse.json({ error: 'word and userId are required' }, { status: 400 });
    }

    // 兼容前端发送的格式：word 可以是字符串或对象
    const wordText = typeof word === 'string' ? word.trim() : (word.word?.trim() || '');
    if (!wordText) {
      return NextResponse.json({ error: 'word is required' }, { status: 400 });
    }
    
    const { data: existingWord, error: checkError } = await supabase
      .from('words')
      .select('*')
      .eq('user_id', userId)
      .ilike('word', wordText)
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

    // 1. 优先查询 dictionary 表
    const { data: dictWord, error: dictError } = await supabase
      .from('dictionary')
      .select('id, word, phonetic, translation')
      .ilike('word', wordText)
      .single();

    if (dictError && dictError.code !== 'PGRST116') {
      console.error('Error checking dictionary:', dictError);
      // 非致命错误，继续以 custom 方式添加
    }

    // 2. 准备单词数据
    const isFromDictionary = !!dictWord;
    // 兼容前端发送的格式：word 可以是字符串或对象
    const wordObj = typeof word === 'string' ? {} : word;
    const wordData = {
      ...wordObj,
      id: randomUUID(),
      word: wordText, // 使用处理后的单词文本
      // 如果 dictionary 中有，使用 dictionary 的数据
      phonetic: dictWord?.phonetic || wordObj.phonetic,
      meanings: isFromDictionary 
        ? convertTranslationToMeanings(dictWord?.translation || '')
        : (wordObj.meanings || []),
      source_type: isFromDictionary ? 'dictionary' : 'custom',
      source_word_id: dictWord?.id || null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const dbWord = mapWordToDB(wordData);

    // 3. 插入单词
    const { data: newWord, error: wordError } = await supabase
      .from('words')
      .insert({ 
        ...dbWord, 
        user_id: userId,
        source_type: wordData.source_type,
        source_word_id: wordData.source_word_id
      })
      .select()
      .single();

    if (wordError) {
      console.error('Error adding word:', wordError);
      return NextResponse.json({ error: wordError.message }, { status: 500 });
    }

    // 4. 重置该单词的 is_excluded 标记（如果之前被排除过）
    const { error: resetError } = await supabase
      .from('user_word_progress')
      .upsert({
        user_id: userId,
        word_id: newWord.id,
        is_excluded: false,
        updated_at: Date.now(),
      }, {
        onConflict: 'user_id,word_id'
      });

    if (resetError) {
      console.error('Error resetting is_excluded:', resetError);
      // 非致命错误，继续执行
    }

    // 5. 查找或创建"自定义单词本"
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

    // 6. 将单词关联到自定义单词本
    if (customBook) {
      const { error: itemError } = await supabase
        .from('word_book_items')
        .insert({
          word_book_id: customBook.id,
          word_id: newWord.id,
          status: 'learning',
          source_type: isFromDictionary ? 'dictionary' : 'word',
          dictionary_id: dictWord?.id || null
        });

      if (itemError) {
        console.error('Error adding word to wordbook:', itemError);
        // 非致命错误，继续执行
      }

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

    // 7. 返回添加的单词（使用驼峰式字段名）
    return NextResponse.json(mapWordFromDB(newWord), { status: 201 });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/words - 更新单词（包括复习进度）
export async function PUT(request: NextRequest) {
  try {
    const { word, userId } = await request.json();

    if (!word || !userId) {
      return NextResponse.json({ error: 'word and userId are required' }, { status: 400 });
    }

    // 检查这是用户手动添加的单词还是单词书单词
    const { data: wordData, error: wordError } = await supabase
      .from('words')
      .select('user_id')
      .eq('id', word.id)
      .single();

    if (wordError) {
      console.error('Error fetching word:', wordError);
      return NextResponse.json({ error: wordError.message }, { status: 500 });
    }

    if (wordData.user_id === userId) {
      // 用户手动添加的单词 - 直接更新 words 表
      const dbWord = mapWordToDB(word);
      const { error } = await supabase
        .from('words')
        .update(dbWord)
        .eq('id', word.id)
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating word:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      // 单词书单词 - 更新 user_word_progress 表
      const { error: progressError } = await supabase
        .from('user_word_progress')
        .upsert({
          user_id: userId,
          word_id: word.id,
          interval: word.interval,
          review_count: word.reviewCount,
          ease_factor: word.easeFactor,
          next_review_at: word.nextReviewAt,
          quality: word.quality,
          updated_at: Date.now()
        }, {
          onConflict: 'user_id,word_id'
        });

      if (progressError) {
        console.error('Error updating word progress:', progressError);
        return NextResponse.json({ error: progressError.message }, { status: 500 });
      }
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
