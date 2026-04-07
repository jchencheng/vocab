export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  try {
    console.log('Edge API received request');
    
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
    
    // 简单的测试响应，暂时不调用 Gemini API
    return new Response(JSON.stringify({ content: 'Test response from Edge API' }), {
      status: 200,
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