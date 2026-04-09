const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

// 直接测试外部 API
async function testExternalAPIs() {
  console.log('Testing External APIs directly...');
  
  const siliconFlowApiKey = process.env.SILICONFLOW_API_KEY;
  const zhipuApiKey = process.env.ZHIPU_API_KEY;
  const googleApiKey = process.env.GOOGLE_API_KEY;
  
  console.log('API Keys configured:');
  console.log('SiliconFlow:', siliconFlowApiKey ? '✓' : '✗');
  console.log('Zhipu:', zhipuApiKey ? '✓' : '✗');
  console.log('Google:', googleApiKey ? '✓' : '✗');
  
  // 测试 SiliconFlow
  if (siliconFlowApiKey) {
    console.log('\nTesting SiliconFlow API...');
    try {
      const response = await axios.post('https://api.siliconflow.cn/v1/chat/completions', {
        model: 'Pro/zai-org/GLM-4.7',
        messages: [
          {
            role: 'system',
            content: '你是一个有用的助手'
          },
          {
            role: 'user',
            content: 'What is the definition of "test"?',
          },
        ],
        max_tokens: 100,
        temperature: 0.7,
        top_p: 0.7,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${siliconFlowApiKey}`,
        },
        timeout: 10000,
      });
      console.log('SiliconFlow API Success:', response.data.choices?.[0]?.message?.content?.substring(0, 50) + '...');
    } catch (error) {
      if (error.response) {
        console.log('SiliconFlow API Error:', error.response.status, error.response.data);
      } else {
        console.log('SiliconFlow API Network Error:', error.message);
      }
    }
  }
  
  // 测试 Zhipu
  if (zhipuApiKey) {
    console.log('\nTesting Zhipu API...');
    try {
      const response = await axios.post('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        model: 'glm-4.7-flash',
        messages: [
          {
            role: 'user',
            content: 'What is the definition of "test"?',
          },
        ],
        max_tokens: 100,
        temperature: 0.7,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${zhipuApiKey}`,
        },
        timeout: 10000,
      });
      console.log('Zhipu API Success:', response.data.choices?.[0]?.message?.content?.substring(0, 50) + '...');
    } catch (error) {
      if (error.response) {
        console.log('Zhipu API Error:', error.response.status, error.response.data);
      } else {
        console.log('Zhipu API Network Error:', error.message);
      }
    }
  }
  
  // 测试 Google
  if (googleApiKey) {
    console.log('\nTesting Google API...');
    try {
      const response = await axios.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:streamGenerateContent?key=' + googleApiKey, {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: 'What is the definition of "test"?',
              },
            ],
          },
        ],
        generationConfig: {
          thinkingConfig: {
            thinkingLevel: 'HIGH'
          }
        },
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
        responseType: 'stream'
      });
      
      // 处理流式响应
      let content = '';
      for await (const chunk of response.data) {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6);
            if (dataStr === '[DONE]') {
              break;
            }
            try {
              const data = JSON.parse(dataStr);
              if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                const parts = data.candidates[0].content.parts;
                for (const part of parts) {
                  if (part.text) {
                    content += part.text;
                  }
                }
              }
            } catch (e) {
              // Ignore parsing errors for chunks
            }
          }
        }
      }
      
      console.log('Google API Success:', content.substring(0, 50) + '...');
    } catch (error) {
      if (error.response) {
        console.log('Google API Error:', error.response.status, error.response.data);
      } else {
        console.log('Google API Network Error:', error.message);
      }
    }
  }
}

// 测试本地 API 路由
async function testLocalAPI() {
  console.log('\n\nTesting Local API Route...');
  
  try {
    const response = await axios.post('http://localhost:3001/api/generate', {
      prompt: 'What is the definition of "test"?',
      model: 'zhipu' // 优先测试 Zhipu，因为之前测试显示它工作正常
    }, {
      timeout: 15000
    });
    console.log('Local API Success:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('Local API Error:', error.response.status, error.response.data);
    } else {
      console.log('Local API Network Error:', error.message);
    }
  }
}

// 运行测试
async function runTests() {
  try {
    await testExternalAPIs();
    await testLocalAPI();
    console.log('\n\nAll tests completed!');
  } catch (error) {
    console.error('Test execution failed:', error);
  }
}

runTests();
