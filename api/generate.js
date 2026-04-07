import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  try {
    console.log('Request received:', req.method, req.url);
    console.log('Request body:', req.body);

    // 确保 req.body 存在
    if (!req.body) {
      console.log('No request body');
      return res.status(400).json({ error: 'No request body' });
    }

    const { prompt, wordList } = req.body;

    if (!prompt) {
      console.log('Missing prompt');
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // 使用 Google Gemini API
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log('API key not configured');
      return res.status(500).json({ error: 'API key not configured' });
    }

    console.log('API key found, making request to Gemini API');

    // 使用 GoogleGenAI SDK
    const ai = new GoogleGenAI({
      apiKey: apiKey,
    });

    const model = 'gemini-3.1-flash-lite-preview';
    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ];

    const response = await ai.models.generateContentStream({
      model,
      contents,
    });

    // 收集所有流式响应内容
    let fullContent = '';
    for await (const chunk of response) {
      if (chunk.text) {
        fullContent += chunk.text;
      }
    }

    console.log('Generated content length:', fullContent.length);

    res.status(200).json({ content: fullContent });
  } catch (error) {
    console.error('Error in generate function:', error);
    res.status(500).json({ error: `Failed to generate content: ${error.message}` });
  }
}
