const axios = require('axios');

const apiKey = process.env.ZHIPU_API_KEY;

async function testGLMAPIPerformance() {
  console.log('Testing GLM API performance...');
  
  const prompt = 'Provide a brief definition of the word "test"';
  
  const startTime = Date.now();
  
  try {
    const response = await axios.post('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      model: 'glm-4.7-flash',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    const content = response.data.choices?.[0]?.message?.content;
    
    console.log('Response received in', responseTime, 'ms');
    console.log('Response:', content?.substring(0, 100) + '...');
    
    return {
      success: true,
      responseTime,
      content: content?.substring(0, 100),
    };
  } catch (error) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return {
      success: false,
      responseTime,
      error: error.message,
    };
  }
}

async function runMultipleTests() {
  console.log('Running multiple tests to check consistency...');
  
  const results = [];
  for (let i = 1; i <= 3; i++) {
    console.log(`\nTest ${i}:`);
    const result = await testGLMAPIPerformance();
    results.push(result);
  }
  
  console.log('\n=== Test Results Summary ===');
  results.forEach((result, index) => {
    console.log(`Test ${index + 1}: ${result.success ? 'Success' : 'Failed'} - ${result.responseTime}ms`);
    if (!result.success) {
      console.log(`  Error: ${result.error}`);
    }
  });
  
  const successfulTests = results.filter(r => r.success);
  if (successfulTests.length > 0) {
    const avgTime = successfulTests.reduce((sum, r) => sum + r.responseTime, 0) / successfulTests.length;
    console.log(`\nAverage response time: ${avgTime.toFixed(2)}ms`);
  }
}

// Run the tests
runMultipleTests().catch(console.error);
