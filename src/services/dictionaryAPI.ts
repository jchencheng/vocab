import type { Word, AppSettings } from '../types';
import { DICTIONARY_API } from '../constants';
import { extractJsonFromText } from '../utils';

interface DictionaryEntry {
  word: string;
  phonetic?: string;
  phonetics: Array<{ text?: string; audio?: string }>;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{
      definition: string;
      example?: string;
      synonyms: string[];
      antonyms: string[];
    }>;
    synonyms: string[];
    antonyms: string[];
  }>;
}

async function translateWithGemini(text: string, settings: AppSettings): Promise<string> {
  const apiUrl = settings.apiEndpoint?.includes('generateContent')
    ? settings.apiEndpoint
    : `${settings.apiEndpoint}:generateContent`;

  const finalUrl = apiUrl.includes('?')
    ? apiUrl
    : `${apiUrl}?key=${settings.apiKey}`;

  const response = await fetch(finalUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Translate the following English text to Chinese: ${text}`,
        }],
      }],
    }),
  });

  if (!response.ok) {
    throw new Error('Translation failed');
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

async function translateWithOpenAI(text: string, settings: AppSettings): Promise<string> {
  const response = await fetch(settings.apiEndpoint!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model || 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content: `Translate the following English text to Chinese: ${text}`,
      }],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error('Translation failed');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function translateText(text: string, settings?: AppSettings): Promise<string> {
  if (!settings?.apiKey || !settings?.apiEndpoint) {
    return text;
  }

  try {
    const isGeminiAPI = settings.apiEndpoint.includes('generativelanguage.googleapis.com');
    return isGeminiAPI
      ? await translateWithGemini(text, settings)
      : await translateWithOpenAI(text, settings);
  } catch (error) {
    console.error('Error translating text:', error);
    return text;
  }
}

function generateDictionaryPrompt(word: string): string {
  return `Generate a comprehensive dictionary entry for the word "${word}". Include:
1. The word itself
2. Phonetic transcription (using IPA)
3. Multiple meanings with part of speech
4. For each meaning, provide:
   - Clear definition in English
   - Chinese translation of the definition
   - Example sentence
5. Return the data in JSON format with the following structure:
{
  "word": "${word}",
  "phonetic": "[IPA transcription]",
  "meanings": [
    {
      "partOfSpeech": "[part of speech]",
      "definitions": [
        {
          "definition": "[English definition]",
          "chineseDefinition": "[Chinese translation]",
          "example": "[Example sentence]"
        }
      ]
    }
  ]
}

Make sure the JSON is valid and well-formatted.`;
}

function parseWordData(content: string): Omit<Word, 'id' | 'tags' | 'createdAt' | 'nextReviewAt' | 'reviewCount' | 'easeFactor' | 'interval' | 'quality'> {
  const jsonStr = extractJsonFromText(content);
  if (!jsonStr) {
    throw new Error('Invalid JSON response from API');
  }

  const wordData = JSON.parse(jsonStr);

  return {
    word: wordData.word,
    phonetic: wordData.phonetic,
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
}

async function generateWithVercelAPI(word: string): Promise<Omit<Word, 'id' | 'tags' | 'createdAt' | 'nextReviewAt' | 'reviewCount' | 'easeFactor' | 'interval' | 'quality'>> {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: generateDictionaryPrompt(word),
      wordList: [word],
    }),
  });

  if (!response.ok) {
    throw new Error('API request failed');
  }

  const data = await response.json();
  return parseWordData(data.content);
}

async function generateWithSettings(
  word: string,
  settings: AppSettings
): Promise<Omit<Word, 'id' | 'tags' | 'createdAt' | 'nextReviewAt' | 'reviewCount' | 'easeFactor' | 'interval' | 'quality'>> {
  const isGeminiAPI = settings.apiEndpoint!.includes('generativelanguage.googleapis.com');

  let response;
  if (isGeminiAPI) {
    const apiUrl = settings.apiEndpoint!.includes('generateContent')
      ? settings.apiEndpoint
      : `${settings.apiEndpoint}:generateContent`;
    const finalUrl = apiUrl!.includes('?')
      ? apiUrl
      : `${apiUrl}?key=${settings.apiKey}`;

    response = await fetch(finalUrl!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: generateDictionaryPrompt(word),
          }],
        }],
      }),
    });
  } else {
    response = await fetch(settings.apiEndpoint!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model || 'gpt-3.5-turbo',
        messages: [{
          role: 'user',
          content: generateDictionaryPrompt(word),
        }],
        temperature: 0.7,
      }),
    });
  }

  if (!response.ok) {
    throw new Error('API request failed');
  }

  const data = await response.json();
  const content = isGeminiAPI
    ? data.candidates[0].content.parts[0].text
    : data.choices[0].message.content;

  return parseWordData(content);
}

export async function generateWordDefinition(
  word: string,
  settings?: AppSettings
): Promise<Omit<Word, 'id' | 'tags' | 'createdAt' | 'nextReviewAt' | 'reviewCount' | 'easeFactor' | 'interval' | 'quality'>> {
  if (settings?.apiKey && settings?.apiEndpoint) {
    try {
      return await generateWithSettings(word, settings);
    } catch (error) {
      console.error('Error generating word definition with settings:', error);
      throw error;
    }
  }

  try {
    return await generateWithVercelAPI(word);
  } catch (error) {
    console.error('Error generating word definition with Vercel API:', error);
    throw error;
  }
}

async function fetchFromDictionaryAPI(word: string): Promise<DictionaryEntry> {
  const response = await fetch(`${DICTIONARY_API}/${encodeURIComponent(word)}`);

  if (!response.ok) {
    throw new Error('Word not found');
  }

  const data = await response.json();
  return data[0];
}

async function translateMeanings(
  meanings: DictionaryEntry['meanings'],
  settings?: AppSettings
): Promise<DictionaryEntry['meanings']> {
  if (!settings?.apiKey || !settings?.apiEndpoint) {
    return meanings;
  }

  const translatedMeanings = await Promise.all(
    meanings.map(async (meaning) => {
      const definitions = await Promise.all(
        meaning.definitions.map(async (def) => {
          const chineseDefinition = await translateText(def.definition, settings);
          return {
            ...def,
            chineseDefinition,
          };
        })
      );
      return {
        ...meaning,
        definitions,
      };
    })
  );

  return translatedMeanings;
}

export async function fetchWord(
  word: string,
  settings?: AppSettings
): Promise<Omit<Word, 'id' | 'tags' | 'createdAt' | 'nextReviewAt' | 'reviewCount' | 'easeFactor' | 'interval' | 'quality'>> {
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
