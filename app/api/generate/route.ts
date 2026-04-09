import { NextRequest, NextResponse } from 'next/server';

const siliconFlowApiKey = process.env.SILICONFLOW_API_KEY;
const zhipuApiKey = process.env.ZHIPU_API_KEY;
const googleApiKey = process.env.GOOGLE_API_KEY;

// 设置超时时间（10秒）
const API_TIMEOUT = 10000;

// 模型配置
const MODELS = {
  SILICONFLOW: {
    name: 'Qwen/Qwen3.5-4B',
    endpoint: 'https://api.siliconflow.cn/v1/chat/completions',
    apiKey: siliconFlowApiKey,
  },
  ZHIPU: {
    name: 'glm-4.7-flash',
    endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    apiKey: zhipuApiKey,
  },
  GOOGLE: {
    name: 'gemini-3-flash-preview',
    endpoint: 'https://generativelanguage.googleapis.com/v1/models/gemini-3-flash-preview:generateContent',
    apiKey: googleApiKey,
  },
};

// 创建一个带有超时的 fetch 函数
const fetchWithTimeout = (url: string, options: RequestInit, timeout: number) => {
  return Promise.race([
    fetch(url, options),
    new Promise<Response>((_, reject) => 
      setTimeout(() => reject(new Error('API request timed out')), timeout)
    )
  ]);
};

// 调用 SiliconFlow API
async function callSiliconFlow(prompt: string) {
  const model = MODELS.SILICONFLOW;
  if (!model.apiKey) {
    throw new Error('SILICONFLOW_API_KEY not configured');
  }

  const response = await fetchWithTimeout(model.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${model.apiKey}`,
    },
    body: JSON.stringify({
      model: model.name,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 8000,
      temperature: 0.7,
      top_p: 0.7,
      enable_thinking: false,
    }),
  }, API_TIMEOUT);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Empty response from AI');
  }

  return { content, model: 'SiliconFlow Qwen 3.5-4B' };
}

// 调用智谱 AI API
async function callZhipu(prompt: string) {
  const model = MODELS.ZHIPU;
  if (!model.apiKey) {
    throw new Error('ZHIPU_API_KEY not configured');
  }

  const response = await fetchWithTimeout(model.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${model.apiKey}`,
    },
    body: JSON.stringify({
      model: model.name,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 65536,
      temperature: 0.7,
    }),
  }, API_TIMEOUT);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Empty response from AI');
  }

  return { content, model: '智谱 GLM-4.7-Flash' };
}

// 调用 Google Gemini API
async function callGoogle(prompt: string) {
  const model = MODELS.GOOGLE;
  if (!model.apiKey) {
    throw new Error('GOOGLE_API_KEY not configured');
  }

  const response = await fetchWithTimeout(`${model.endpoint}?key=${model.apiKey}`, {
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
      generationConfig: {
        maxOutputTokens: 8000,
        temperature: 0.7,
      },
    }),
  }, API_TIMEOUT);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    throw new Error('Empty response from AI');
  }

  return { content, model: 'Google Gemini' };
}

// 尝试使用多个模型，实现故障转移
async function tryMultipleModels(prompt: string, preferredModel?: string) {
  const modelsToTry = preferredModel 
    ? [preferredModel, 'zhipu', 'google']
    : ['siliconflow', 'zhipu', 'google'];

  let lastError: Error | null = null;

  for (const modelName of modelsToTry) {
    try {
      switch (modelName) {
        case 'siliconflow':
          if (siliconFlowApiKey) {
            console.log('Trying SiliconFlow Qwen 3.5-4B...');
            return await callSiliconFlow(prompt);
          }
          break;
        case 'zhipu':
          if (zhipuApiKey) {
            console.log('Trying Zhipu GLM-4.7-Flash...');
            return await callZhipu(prompt);
          }
          break;
        case 'google':
          if (googleApiKey) {
            console.log('Trying Google Gemini...');
            return await callGoogle(prompt);
          }
          break;
      }
    } catch (error: any) {
      console.error(`Error with ${modelName}:`, error.message);
      lastError = error;
    }
  }

  throw lastError || new Error('No available models configured');
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, wordList, model } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    // 尝试使用多个模型，实现故障转移
    const result = await tryMultipleModels(prompt, model);

    return NextResponse.json({ 
      content: result.content,
      model: result.model,
      message: `Using ${result.model} for generation`
    });
  } catch (error: any) {
    console.error('Generate API error:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to generate content',
        message: 'All models failed. Please check your network connection and API keys.',
        models: [
          { value: 'siliconflow', label: 'SiliconFlow Qwen 3.5-4B' },
          { value: 'zhipu', label: '智谱 GLM-4.7-Flash' },
          { value: 'google', label: 'Google Gemini' }
        ]
      },
      { status: 500 }
    );
  }
}
