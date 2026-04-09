import type { Word, Meaning, AppSettings } from '../types';
import { extractJsonFromText } from '../utils';

interface FreeDictionaryEntry {
  word: string;
  phonetic?: string;
  phonetics?: { text?: string; audio?: string }[];
  meanings: {
    partOfSpeech: string;
    definitions: {
      definition: string;
      example?: string;
      synonyms: string[];
      antonyms: string[];
    }[];
    synonyms: string[];
    antonyms: string[];
  }[];
}

export async function fetchFromDictionaryAPI(word: string): Promise<FreeDictionaryEntry> {
  const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
  
  if (!response.ok) {
    throw new Error(`Dictionary API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data[0];
}

async function translateMeanings(
  meanings: Meaning[],
  settings?: AppSettings
): Promise<Meaning[]> {
  // If no API key is configured, return meanings without Chinese translations
  if (!settings?.apiKey) {
    return meanings.map(meaning => ({
      ...meaning,
      definitions: meaning.definitions.map(def => ({
        ...def,
        chineseDefinition: undefined,
      })),
    }));
  }

  try {
    const definitions = meanings.flatMap(m => 
      m.definitions.map(d => d.definition)
    );
    
    const prompt = `Translate these English definitions to Chinese (simplified). Return ONLY a JSON array of strings in the same order:
${JSON.stringify(definitions, null, 2)}`;

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error('Translation API error');
    }

    const data = await response.json();
    const translations = JSON.parse(data.content);

    let index = 0;
    return meanings.map(meaning => ({
      ...meaning,
      definitions: meaning.definitions.map(def => ({
        ...def,
        chineseDefinition: translations[index++] || undefined,
      })),
    }));
  } catch (error) {
    console.error('Translation error:', error);
    return meanings;
  }
}

function parseWordData(content: string): Omit<Word, 'id' | 'tags' | 'createdAt' | 'updatedAt' | 'nextReviewAt' | 'reviewCount' | 'easeFactor' | 'interval' | 'quality'> {
  console.log('Raw API response:', content);
  
  const jsonStr = extractJsonFromText(content);
  console.log('Extracted JSON string:', jsonStr);
  
  if (!jsonStr) {
    throw new Error('Invalid JSON response from API');
  }

  try {
    const wordData = JSON.parse(jsonStr);
    console.log('Parsed word data:', wordData);
    
    return {
      word: wordData.word,
      phonetic: wordData.phonetic || wordData.honetic, // 支持拼写错误的字段
      phonetics: [],
      meanings: wordData.meanings.map((meaning: any) => ({
        ...meaning,
        definitions: meaning.definitions.map((def: any) => ({
          ...def,
          synonyms: [],
          antonyms: [],
        })),
        synonyms: [],
        antonyms: [],
      })),
    };
  } catch (error) {
    console.error('JSON parsing error:', error);
    console.error('Invalid JSON string:', jsonStr);
    throw new Error('Failed to parse JSON response');
  }
}

async function generateWithVercelAPI(word: string): Promise<Omit<Word, 'id' | 'tags' | 'createdAt' | 'updatedAt' | 'nextReviewAt' | 'reviewCount' | 'easeFactor' | 'interval' | 'quality'>> {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: `Provide a detailed dictionary definition for the word "${word}" in JSON format with the following structure:
{
  "word": "${word}",
  "phonetic": "/phonetic/",
  "meanings": [
    {
      "partOfSpeech": "noun|verb|adjective|adverb|etc",
      "definitions": [
        {
          "definition": "clear English definition",
          "example": "example sentence",
          "chineseDefinition": "中文释义"
        }
      ]
    }
  ]
}
Include at least 2 meanings with different parts of speech if applicable.`,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return parseWordData(data.content);
}

async function generateWordDefinition(
  word: string,
  settings?: AppSettings
): Promise<Omit<Word, 'id' | 'tags' | 'createdAt' | 'updatedAt' | 'nextReviewAt' | 'reviewCount' | 'easeFactor' | 'interval' | 'quality'>> {
  // Use Vercel API with GLM-4.7-Flash
  return await generateWithVercelAPI(word);
}

export async function fetchWord(
  word: string,
  settings?: AppSettings
): Promise<Omit<Word, 'id' | 'tags' | 'createdAt' | 'updatedAt' | 'nextReviewAt' | 'reviewCount' | 'easeFactor' | 'interval' | 'quality'>> {
  try {
    return await generateWordDefinition(word, settings);
  } catch (error) {
    console.error('Error generating word definition, falling back to dictionary API:', error);
  }

  try {
    const entry = await fetchFromDictionaryAPI(word);
    const translatedMeanings = await translateMeanings(entry.meanings, settings);

    return {
      word: entry.word,
      phonetic: entry.phonetic,
      phonetics: entry.phonetics || [],
      meanings: translatedMeanings,
    };
  } catch (error) {
    console.error('Error fetching word:', error);
    throw error;
  }
}
