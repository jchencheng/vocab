import { NextRequest, NextResponse } from 'next/server';

const siliconFlowApiKey = process.env.SILICONFLOW_API_KEY;
const zhipuApiKey = process.env.ZHIPU_API_KEY;
const googleApiKey = process.env.GOOGLE_API_KEY;

// 设置超时时间（30秒）
const API_TIMEOUT = 30000;

// 模型配置
const MODELS = {
  SILICONFLOW: {
    name: 'tencent/Hunyuan-MT-7B',
    endpoint: 'https://api.siliconflow.cn/v1/chat/completions',
    apiKey: siliconFlowApiKey,
  },
  ZHIPU: {
    name: 'glm-4.7-flash',
    endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    apiKey: zhipuApiKey,
  },
  GOOGLE: {
    name: 'gemini-3.1-flash-lite',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent',
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
    }),
  }, API_TIMEOUT);

  if (!response.ok) {
    try {
      const errorData = await response.json();
      const errorMessage = errorData.error?.message || errorData.error || `API error: ${response.status}`;
      throw new Error(errorMessage);
    } catch (jsonError) {
      throw new Error(`API error: ${response.status}`);
    }
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Empty response from AI');
  }

  return { content, model: 'SiliconFlow GLM-4.7' };
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
      thinking: {
        type: 'disabled'
      },
      max_tokens: 65536,
      temperature: 1.0,
    }),
  }, API_TIMEOUT);

  if (!response.ok) {
      try {
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || errorData.error || `API error: ${response.status}`;
        throw new Error(errorMessage);
      } catch (jsonError) {
        throw new Error(`API error: ${response.status}`);
      }
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
          role: 'user',
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
    try {
      const errorData = await response.json();
      const errorMessage = errorData.error?.message || errorData.error || `API error: ${response.status}`;
      throw new Error(errorMessage);
    } catch (jsonError) {
      throw new Error(`API error: ${response.status}`);
    }
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
  // 构建模型尝试顺序：首选模型 -> 其他模型（无重复）
  const allModels = ['siliconflow', 'zhipu', 'google'];
  const modelsToTry = preferredModel 
    ? [preferredModel, ...allModels.filter(m => m !== preferredModel)]
    : allModels;

  let lastError: Error | null = null;

  console.log('\n==================================');
  console.log('Starting model fallback sequence:', modelsToTry);
  console.log('Prompt:', prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''));
  console.log('==================================');

  for (const modelName of modelsToTry) {
    try {
      console.log(`\n[${new Date().toLocaleTimeString()}] Attempting ${modelName}...`);
      
      switch (modelName) {
        case 'siliconflow':
          if (siliconFlowApiKey) {
            console.log('  SiliconFlow API key configured, calling...');
            const result = await callSiliconFlow(prompt);
            console.log('  ✓ SiliconFlow successful');
            console.log('  Response:', result.content.substring(0, 200) + (result.content.length > 200 ? '...' : ''));
            return result;
          } else {
            console.log('  ⚠ SiliconFlow API key not configured');
          }
          break;
        case 'zhipu':
          if (zhipuApiKey) {
            console.log('  Zhipu API key configured, calling...');
            const result = await callZhipu(prompt);
            console.log('  ✓ Zhipu successful');
            console.log('  Response:', result.content.substring(0, 200) + (result.content.length > 200 ? '...' : ''));
            return result;
          } else {
            console.log('  ⚠ Zhipu API key not configured');
          }
          break;
        case 'google':
          if (googleApiKey) {
            console.log('  Google API key configured, calling...');
            const result = await callGoogle(prompt);
            console.log('  ✓ Google successful');
            console.log('  Response:', result.content.substring(0, 200) + (result.content.length > 200 ? '...' : ''));
            return result;
          } else {
            console.log('  ⚠ Google API key not configured');
          }
          break;
      }
    } catch (error: any) {
      console.error(`  ✗ Error with ${modelName}:`, error.message);
      lastError = error;
    }
  }

  console.log('\n==================================');
  console.log('All models failed:', lastError?.message);
  console.log('==================================');
  throw lastError || new Error('No available models configured');
}

export async function POST(request: NextRequest) {
  try {
    console.log('\n==================================');
    console.log('[API Request] Received POST /api/generate');
    console.log('==================================');
    
    const { prompt, wordList, model } = await request.json();
    
    console.log('Request details:');
    console.log('  Model:', model || 'default');
    console.log('  Word list length:', wordList?.length || 0);
    console.log('  Prompt:', prompt?.substring(0, 100) + (prompt?.length > 100 ? '...' : ''));

    if (!prompt) {
      console.log('  ⚠ Missing prompt');
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    console.log('  ✓ Processing request...');
    // 尝试使用多个模型，实现故障转移
    const result = await tryMultipleModels(prompt, model);
    
    console.log('\n==================================');
    console.log('[API Response] Success');
    console.log('==================================');
    console.log('  Model used:', result.model);
    console.log('  Response length:', result.content.length);
    console.log('  Response preview:', result.content.substring(0, 200) + (result.content.length > 200 ? '...' : ''));

    return NextResponse.json({ 
      content: result.content,
      model: result.model,
      message: `Using ${result.model} for generation`
    });
  } catch (error: any) {
    console.error('\n==================================');
    console.error('[API Error] Generate API error:', error);
    console.error('==================================');
    
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
