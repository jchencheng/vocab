const axios = require('axios');
const dotenv = require('dotenv');

// 加载 .env.local 文件
dotenv.config({ path: '.env.local' });

// 从环境变量获取 API Key
const siliconFlowApiKey = process.env.SILICONFLOW_API_KEY;
const zhipuApiKey = process.env.ZHIPU_API_KEY;
const googleApiKey = process.env.GOOGLE_API_KEY;

console.log('Testing API connections...');
console.log('SiliconFlow API Key:', siliconFlowApiKey ? '✓ Configured' : '✗ Missing');
console.log('Zhipu API Key:', zhipuApiKey ? '✓ Configured' : '✗ Missing');
console.log('Google API Key:', googleApiKey ? '✓ Configured' : '✗ Missing');

// 测试网络连接
async function testNetworkConnection() {
  console.log('\nTesting network connections...');
  
  const endpoints = [
    { name: 'SiliconFlow', url: 'https://api.siliconflow.cn' },
    { name: 'Zhipu', url: 'https://open.bigmodel.cn' },
    { name: 'Google', url: 'https://generativelanguage.googleapis.com' },
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint.name}...`);
      const start = Date.now();
      const response = await axios.get(endpoint.url, {
        timeout: 10000,
      });
      const end = Date.now();
      console.log(`✓ ${endpoint.name} - Status: ${response.status} (${end - start}ms)`);
    } catch (error) {
      console.log(`✗ ${endpoint.name} - Error: ${error.message}`);
    }
  }
}

// 测试 SiliconFlow API
async function testSiliconFlow() {
  if (!siliconFlowApiKey) {
    console.log('\nSiliconFlow API Key not configured, skipping test');
    return;
  }
  
  console.log('\nTesting SiliconFlow API...');
  
  try {
    const response = await axios.post('https://api.siliconflow.cn/v1/chat/completions', {
      model: 'Qwen/Qwen3.5-4B',
      messages: [
        {
          role: 'user',
          content: 'Hello, test message',
        },
      ],
      max_tokens: 100,
      temperature: 0.7,
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
      console.log('SiliconFlow API Test Error:', error.message);
    }
  }
}

// 测试智谱 AI API
async function testZhipu() {
  if (!zhipuApiKey) {
    console.log('\nZhipu API Key not configured, skipping test');
    return;
  }
  
  console.log('\nTesting Zhipu API...');
  
  try {
    const response = await axios.post('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      model: 'glm-4.7-flash',
      messages: [
        {
          role: 'user',
          content: 'Hello, test message',
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
      console.log('Zhipu API Test Error:', error.message);
    }
  }
}

// 运行测试
async function runTests() {
  await testNetworkConnection();
  await testSiliconFlow();
  await testZhipu();
  console.log('\nTest completed!');
}

runTests().catch(console.error);
