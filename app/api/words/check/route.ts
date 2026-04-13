import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../services/supabase';

// 将 dictionary 的 translation 转换为 meanings 格式
function convertTranslationToMeanings(translation: string): any[] {
  if (!translation) return [];

  const parts = translation.split(/\n/);
  const meanings: any[] = [];

  for (const part of parts) {
    const match = part.match(/^([a-z]+)\.\s*(.+)$/i);
    if (match) {
      meanings.push({
        partOfSpeech: match[1],
        definitions: match[2].split(/[,;]/).map(d => d.trim()).filter(Boolean).map(d => ({
          definition: d,
          chineseDefinition: d,
          synonyms: [],
          antonyms: [],
        })),
        synonyms: [],
        antonyms: [],
      });
    } else if (part.trim()) {
      meanings.push({
        partOfSpeech: 'general',
        definitions: part.split(/[,;]/).map(d => d.trim()).filter(Boolean).map(d => ({
          definition: d,
          chineseDefinition: d,
          synonyms: [],
          antonyms: [],
        })),
        synonyms: [],
        antonyms: [],
      });
    }
  }

  return meanings;
}

// GET /api/words/check?word=xxx&userId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const word = searchParams.get('word');
    const userId = searchParams.get('userId');

    if (!word || !userId) {
      return NextResponse.json(
        { error: 'Word and userId are required' },
        { status: 400 }
      );
    }

    const normalizedWord = word.trim().toLowerCase();

    // 1. 检查用户是否已添加
    const { data: userWord } = await supabase
      .from('words')
      .select('*')
      .eq('user_id', userId)
      .ilike('word', normalizedWord)
      .single();

    // 2. 检查系统单词书
    const { data: builtinWord } = await supabase
      .from('words')
      .select('*')
      .is('user_id', null)
      .ilike('word', normalizedWord)
      .single();

    // 3. 检查 dictionary 表
    const { data: dictWord } = await supabase
      .from('dictionary')
      .select('*')
      .ilike('word', normalizedWord)
      .single();

    // 构建 dictionary word 对象
    const dictionaryWord = dictWord ? {
      id: dictWord.id,
      word: dictWord.word,
      phonetic: dictWord.phonetic,
      meanings: convertTranslationToMeanings(dictWord.translation),
      sourceType: 'dictionary',
    } : null;

    return NextResponse.json({
      existsInUserLibrary: !!userWord,
      existsInBuiltin: !!builtinWord,
      existsInDictionary: !!dictWord,
      userWord,
      builtinWord,
      dictionaryWord,
    });
  } catch (error: any) {
    console.error('Error checking word:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check word' },
      { status: 500 }
    );
  }
}
