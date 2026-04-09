const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const API_BASE_URL = 'http://localhost:3000/api';

// 测试生成 API
async function testGenerateAPI() {
  console.log('Testing Generate API...');
  
  const testPrompts = [
    'What is the definition of "vocabulary"?',
    'Explain "machine learning" in simple terms',
  ];
  
  const models = ['siliconflow', 'zhipu', 'google'];
  
  for (const prompt of testPrompts) {
    console.log(`\nTesting prompt: "${prompt}"`);
    
    for (const model of models) {
      console.log(`\n  Testing model: ${model}`);
      
      try {
        const response = await axios.post(`${API_BASE_URL}/generate`, {
          prompt: prompt,
          model: model
        }, {
          timeout: 15000
        });
        
        console.log(`    ✓ Success - Status: ${response.status}`);
        console.log(`    ✓ Model used: ${response.data.model}`);
        console.log(`    ✓ Content received: ${response.data.content.substring(0, 100)}...`);
        
      } catch (error) {
        if (error.response) {
          console.log(`    ✗ Error - Status: ${error.response.status}`);
          console.log(`    ✗ Message: ${error.response.data.error || 'Unknown error'}`);
        } else {
          console.log(`    ✗ Network error: ${error.message}`);
        }
      }
    }
  }
}

// 测试故障转移
async function testFailover() {
  console.log('\n\nTesting Failover Mechanism...');
  
  // 测试一个不存在的模型，应该触发故障转移
  try {
    const response = await axios.post(`${API_BASE_URL}/generate`, {
      prompt: 'Test failover mechanism',
      model: 'non-existent-model'
    }, {
      timeout: 15000
    });
    
    console.log(`✓ Failover success - Used model: ${response.data.model}`);
    console.log(`✓ Content: ${response.data.content.substring(0, 100)}...`);
  } catch (error) {
    console.log(`✗ Failover test failed: ${error.message}`);
  }
}

// 运行所有测试
async function runTests() {
  try {
    await testGenerateAPI();
    await testFailover();
    console.log('\n\nAll tests completed!');
  } catch (error) {
    console.error('Test execution failed:', error);
  }
}

runTests();
