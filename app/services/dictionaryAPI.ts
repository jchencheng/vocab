import type { Word } from '../types';
import { batchTranslateDefinitions as baiduBatchTranslate, isBaiduTranslateConfiguredSync, getBaiduTranslateConfigStatus } from './baiduTranslateAPI';

interface FreeDictionaryDefinition {
  definition: string;
  example?: string;
  synonyms: string[];
  antonyms: string[];
}

interface FreeDictionaryMeaning {
  partOfSpeech: string;
  definitions: FreeDictionaryDefinition[];
  synonyms: string[];
  antonyms: string[];
}

interface FreeDictionaryPhonetic {
  text?: string;
  audio?: string;
}

interface FreeDictionaryResponse {
  word: string;
  phonetic?: string;
  phonetics: FreeDictionaryPhonetic[];
  origin?: string;
  meanings: FreeDictionaryMeaning[];
}

/**
 * 从 Free Dictionary API 获取单词定义
 * https://dictionaryapi.dev/
 */
export async function fetchWordFromDictionary(word: string): Promise<Omit<Word, 'id' | 'tags' | 'createdAt' | 'updatedAt' | 'nextReviewAt' | 'reviewCount' | 'easeFactor' | 'interval' | 'quality'> | null> {
  try {
    console.log('[Dictionary API] Fetching word:', word);
    
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Word "${word}" not found in dictionary`);
      }
      throw new Error(`Dictionary API error: ${response.status}`);
    }
    
    const data: FreeDictionaryResponse[] = await response.json();
    
    if (!data || data.length === 0) {
      console.log('[Dictionary API] No data found for word:', word);
      return null;
    }
    
    const entry = data[0];
    
    // 提取音标
    const phonetic = entry.phonetic || entry.phonetics.find(p => p.text)?.text || '';
    
    // 提取音频 URL
    const audioUrl = entry.phonetics.find(p => p.audio)?.audio || '';
    
    // 转换 meanings 格式
    const meanings = entry.meanings.map((meaning) => ({
      partOfSpeech: meaning.partOfSpeech,
      definitions: meaning.definitions.map((def) => ({
        definition: def.definition,
        example: def.example || '',
        chineseDefinition: '', // 初始为空，需要手动翻译
        synonyms: def.synonyms || [],
        antonyms: def.antonyms || [],
      })),
      synonyms: meaning.synonyms || [],
      antonyms: meaning.antonyms || [],
    }));
    
    console.log('[Dictionary API] Successfully fetched word:', {
      word: entry.word,
      phonetic,
      meaningsCount: meanings.length,
    });
    
    return {
      word: entry.word,
      phonetic,
      phonetics: audioUrl ? [{ text: phonetic, audio: audioUrl }] : [],
      meanings,
    };
  } catch (error) {
    console.error('[Dictionary API] Error fetching from dictionary API:', error);
    throw error;
  }
}

/**
 * 批量翻译英文释义为中文
 * 使用百度翻译 API 进行翻译
 */
export async function translateDefinitionsToChinese(
  definitions: { definition: string; example?: string }[]
): Promise<{ definition: string; example?: string; chineseDefinition: string }[]> {
  console.log('[Dictionary API] Starting translation for', definitions.length, 'definitions');
  
  // 检查百度翻译配置（使用同步版本，实际配置检查在服务端完成）
  if (!isBaiduTranslateConfiguredSync()) {
    const configStatus = getBaiduTranslateConfigStatus();
    console.error('[Dictionary API] Baidu Translate not configured:', configStatus);
    throw new Error(
      '百度翻译 API 未配置。请在 .env.local 文件中设置:\n' +
      'NEXT_PUBLIC_BAIDU_APP_ID=你的APPID\n' +
      'NEXT_PUBLIC_BAIDU_SECRET_KEY=你的密钥'
    );
  }
  
  try {
    // 使用百度翻译 API
    const results = await baiduBatchTranslate(definitions);
    console.log('[Dictionary API] Translation completed successfully');
    return results;
  } catch (error) {
    console.error('[Dictionary API] Translation failed:', error);
    throw error;
  }
}

/**
 * 获取翻译服务配置状态
 */
export function getTranslationConfigStatus(): {
  baiduConfigured: boolean;
  configStatus: ReturnType<typeof getBaiduTranslateConfigStatus>;
} {
  return {
    baiduConfigured: isBaiduTranslateConfiguredSync(),
    configStatus: getBaiduTranslateConfigStatus(),
  };
}
