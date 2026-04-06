module.exports = async function handler(req, res) {
  try {
    const { prompt, apiKey, apiEndpoint, model, isGeminiAPI } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    if (!apiKey || !apiEndpoint) {
      return res.status(400).json({ error: 'API key and endpoint are required' });
    }
    
    let response;
    
    if (isGeminiAPI) {
      // Google Gemini API 调用
      const apiUrl = apiEndpoint.includes('generateContent') 
        ? apiEndpoint 
        : `${apiEndpoint}:generateContent`;
      
      // 确保 API 密钥在 URL 中
      const finalUrl = apiUrl.includes('?') 
        ? apiUrl 
        : `${apiUrl}?key=${apiKey}`;
      
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
      // OpenAI API 调用
      response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || 'gpt-3.5-turbo',
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
      const errorText = await response.text();
      throw new Error(`API request failed: ${errorText}`);
    }
    
    const data = await response.json();
    
    // 处理不同 API 的响应格式
    let content;
    if (isGeminiAPI) {
      content = data.candidates[0].content.parts[0].text;
    } else {
      content = data.choices[0].message.content;
    }
    
    res.status(200).json({ content });
  } catch (error) {
    console.error('Error in generate function:', error);
    res.status(500).json({ error: `Failed to generate content: ${error.message}` });
  }
}
