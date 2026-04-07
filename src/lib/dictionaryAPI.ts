

interface Word {
  id: string;
  word: string;
  phonetic?: string;
  phonetics?: Array<{ text?: string; audio?: string }>;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{
      definition: string;
      chineseDefinition?: string;
      example?: string;
      synonyms: string[];
      antonyms: string[];
    }>;
    synonyms: string[];
    antonyms: string[];
  }>;
  tags: string[];
  createdAt: number;
  nextReviewAt: number;
  reviewCount: number;
  easeFactor: number;
  interval: number;
  quality: number;
  customNote?: string;
}

const DICTIONARY_API = 'https://api.dictionaryapi.dev/api/v2/entries/en';

// 翻译函数
export async function translateText(text: string, settings: any): Promise<string> {
  if (!settings.apiKey || !settings.apiEndpoint) {
    return text;
  }

  try {
    // 检查是否是 Google Gemini API
    const isGeminiAPI = settings.apiEndpoint.includes('generativelanguage.googleapis.com');
    let response;

    if (isGeminiAPI) {
      // Google Gemini API 格式
      const apiUrl = settings.apiEndpoint.includes('generateContent') 
        ? settings.apiEndpoint 
        : `${settings.apiEndpoint}:generateContent`;
      
      // 确保 API 密钥在 URL 中
      const finalUrl = apiUrl.includes('?') 
        ? apiUrl 
        : `${apiUrl}?key=${settings.apiKey}`;
      
      response = await fetch(finalUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Translate the following English text to Chinese: ${text}`,
                },
              ],
            },
          ],
        }),
      });
    } else {
      // OpenAI API 格式
      response = await fetch(settings.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify({
          model: settings.model || 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: `Translate the following English text to Chinese: ${text}`,
            },
          ],
          temperature: 0.7,
        }),
      });
    }

    if (!response.ok) {
      throw new Error('Translation failed');
    }

    // 处理 API 响应
    const data = await response.json();
    if (isGeminiAPI) {
      return data.candidates[0].content.parts[0].text;
    } else {
      return data.choices[0].message.content;
    }
  } catch (error) {
    console.error('Error translating text:', error);
    return text;
  }
}

// 使用内置的大模型 API 生成词典解释
export async function generateWordDefinitionWithEnv(word: string): Promise<Omit<Word, 'id' | 'tags' | 'createdAt' | 'nextReviewAt' | 'reviewCount' | 'easeFactor' | 'interval' | 'quality'>> {
  const prompt = `Generate a comprehensive dictionary entry for the word "${word}". Include:
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

  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      wordList: [word]
    }),
  });

  if (!response.ok) {
    throw new Error('API request failed');
  }

  const data = await response.json();
  const content = data.content;

  // 提取 JSON 部分
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Invalid JSON response from API');
  }

  const wordData = JSON.parse(jsonMatch[0]);
  
  // 确保数据结构完整
  return {
    word: wordData.word,
    phonetic: wordData.phonetic,
    phonetics: [], // 大模型生成的数据可能不包含发音 URL
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

// 使用大模型生成词典解释（通过 settings 配置，保留用于兼容性）
export async function generateWordDefinition(word: string, settings: any): Promise<Omit<Word, 'id' | 'tags' | 'createdAt' | 'nextReviewAt' | 'reviewCount' | 'easeFactor' | 'interval' | 'quality'>> {
  // 如果配置了 settings，使用旧的逻辑
  if (settings?.apiKey && settings?.apiEndpoint) {
    try {
      // 检查是否是 Google Gemini API
      const isGeminiAPI = settings.apiEndpoint.includes('generativelanguage.googleapis.com');
      let response;

      const prompt = `Generate a comprehensive dictionary entry for the word "${word}". Include:
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

      if (isGeminiAPI) {
        // Google Gemini API 格式
        const apiUrl = settings.apiEndpoint.includes('generateContent') 
          ? settings.apiEndpoint 
          : `${settings.apiEndpoint}:generateContent`;
        
        // 确保 API 密钥在 URL 中
        const finalUrl = apiUrl.includes('?') 
          ? apiUrl 
          : `${apiUrl}?key=${settings.apiKey}`;
        
        response = await fetch(finalUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
          }),
        });
      } else {
        // OpenAI API 格式
        response = await fetch(settings.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.apiKey}`,
          },
          body: JSON.stringify({
            model: settings.model || 'gpt-3.5-turbo',
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.7,
          }),
        });
      }

      if (!response.ok) {
        throw new Error('API request failed');
      }

      // 处理 API 响应
      const data = await response.json();
      let content;
      if (isGeminiAPI) {
        content = data.candidates[0].content.parts[0].text;
      } else {
        content = data.choices[0].message.content;
      }

      // 提取 JSON 部分
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON response from API');
      }

      const wordData = JSON.parse(jsonMatch[0]);
      
      // 确保数据结构完整
      return {
        word: wordData.word,
        phonetic: wordData.phonetic,
        phonetics: [], // 大模型生成的数据可能不包含发音 URL
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
      console.error('Error generating word definition:', error);
      throw error;
    }
  }
  
  // 如果没有配置 settings，使用内置 API
  return generateWordDefinitionWithEnv(word);
}

export async function fetchWord(word: string, settings?: any): Promise<Omit<Word, 'id' | 'tags' | 'createdAt' | 'nextReviewAt' | 'reviewCount' | 'easeFactor' | 'interval' | 'quality'>> {
  // 优先使用大模型生成词典解释
  try {
    return await generateWordDefinitionWithEnv(word);
  } catch (error) {
    console.error('Error generating word definition with AI, falling back to dictionary API:', error);
    // 大模型生成失败，回退到词典 API
  }

  // 使用词典 API
  try {
    const response = await fetch(`${DICTIONARY_API}/${encodeURIComponent(word)}`);
    
    if (!response.ok) {
      throw new Error('Word not found');
    }

    const data = await response.json();
    const entry = data[0];

    // 处理释义，添加中文翻译
    const meanings = (entry.meanings || []).map(async (meaning: any) => {
      const definitions = await Promise.all(meaning.definitions.map(async (def: any) => {
        let chineseDefinition;
        if (settings?.apiKey && settings?.apiEndpoint) {
          // 使用大模型 API 翻译
          chineseDefinition = await translateText(def.definition, settings);
        }
        return {
          ...def,
          chineseDefinition,
        };
      }));
      return {
        ...meaning,
        definitions,
      };
    });

    const resolvedMeanings = await Promise.all(meanings);

    return {
      word: entry.word,
      phonetic: entry.phonetic,
      phonetics: entry.phonetics || [],
      meanings: resolvedMeanings,
    };
  } catch (error) {
    console.error('Error fetching word:', error);
    throw error;
  }
}
