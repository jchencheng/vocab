import { GoogleGenAI } from '@google/genai';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  try {
    console.log('Edge API received request:', req.method);

    // 处理 GET 请求
    if (req.method === 'GET') {
      return new Response(JSON.stringify({ message: 'Edge API works! Try sending a POST request with prompt parameter.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 处理 POST 请求
    if (req.method === 'POST') {
      const { prompt, wordList } = await req.json();

      if (!prompt) {
        return new Response(JSON.stringify({ error: 'Prompt is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // 使用 Google Gemini API
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: 'API key not configured' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      console.log('API key found, making request to Gemini API');

      // 使用 GoogleGenAI SDK
      const ai = new GoogleGenAI({
        apiKey: apiKey,
      });

      const model = 'gemini-2.0-flash';
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

      return new Response(JSON.stringify({ content: fullContent }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 处理其他请求方法
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in Edge API:', error);
    return new Response(JSON.stringify({ error: `Failed to generate content: ${error.message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
