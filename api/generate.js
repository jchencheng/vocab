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

    // 使用 Gemini REST API
    const model = 'gemini-3.1-flash-lite-preview';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    console.log('Gemini API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Gemini API error:', errorText);
      return res.status(500).json({ error: `API request failed: ${errorText}` });
    }

    const data = await response.json();
    console.log('Gemini API response data:', JSON.stringify(data).slice(0, 500));

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
      console.log('Invalid response structure:', data);
      return res.status(500).json({ error: 'Invalid response from Gemini API' });
    }

    const content = data.candidates[0].content.parts[0].text;

    res.status(200).json({ content });
  } catch (error) {
    console.error('Error in generate function:', error);
    res.status(500).json({ error: `Failed to generate content: ${error.message}` });
  }
}
