/**
 * 导入 dictionary_500k.jsonl 到 Supabase
 * 分批处理以避免内存问题和请求超时
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 配置
const BATCH_SIZE = 1000; // 每批插入的数量
const DELAY_BETWEEN_BATCHES = 100; // 批次间延迟(ms)
const DICTIONARY_FILE = path.join(__dirname, '..', 'dictionary_500k.jsonl');

// Supabase 配置
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // 需要 service role key

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 解析 JSONL 行
function parseLine(line) {
  try {
    const data = JSON.parse(line);
    return {
      word: data.word,
      phonetic: data.phonetic || null,
      translation: data.translation,
      exchange: data.exchange ? JSON.parse(JSON.stringify(data.exchange)) : null
    };
  } catch (error) {
    console.error('Parse error:', error.message, 'Line:', line.substring(0, 100));
    return null;
  }
}

// 分批插入数据
async function insertBatch(batch, batchNumber) {
  const { data, error } = await supabase
    .from('dictionary')
    .upsert(batch, {
      onConflict: 'word',
      ignoreDuplicates: true
    });

  if (error) {
    console.error(`Batch ${batchNumber} error:`, error.message);
    return false;
  }

  console.log(`Batch ${batchNumber}: Inserted ${batch.length} records`);
  return true;
}

// 主函数
async function importDictionary() {
  console.log('Starting dictionary import...');
  console.log('File:', DICTIONARY_FILE);

  // 检查文件是否存在
  if (!fs.existsSync(DICTIONARY_FILE)) {
    console.error('Error: Dictionary file not found:', DICTIONARY_FILE);
    process.exit(1);
  }

  // 读取文件
  const fileContent = fs.readFileSync(DICTIONARY_FILE, 'utf-8');
  const lines = fileContent.split('\n').filter(line => line.trim());

  console.log(`Total lines to process: ${lines.length}`);

  // 统计
  let successCount = 0;
  let errorCount = 0;
  let batchNumber = 0;
  let currentBatch = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parsed = parseLine(line);

    if (parsed) {
      currentBatch.push(parsed);
    } else {
      errorCount++;
    }

    // 达到批次大小，执行插入
    if (currentBatch.length >= BATCH_SIZE || i === lines.length - 1) {
      batchNumber++;
      console.log(`\nProcessing batch ${batchNumber} (${currentBatch.length} records)...`);

      const success = await insertBatch(currentBatch, batchNumber);
      if (success) {
        successCount += currentBatch.length;
      } else {
        errorCount += currentBatch.length;
      }

      // 清空批次
      currentBatch = [];

      // 延迟避免请求过快
      if (i < lines.length - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }

      // 每 10 批显示进度
      if (batchNumber % 10 === 0) {
        const progress = ((i + 1) / lines.length * 100).toFixed(2);
        console.log(`\n=== Progress: ${progress}% (${i + 1}/${lines.length}) ===`);
      }
    }
  }

  console.log('\n========================================');
  console.log('Import completed!');
  console.log(`Total processed: ${successCount + errorCount}`);
  console.log(`Success: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log('========================================');
}

// 运行
importDictionary().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
