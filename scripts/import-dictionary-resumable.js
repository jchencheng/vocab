/**
 * 导入 dictionary_500k.jsonl 到 Supabase（支持断点续传）
 * 分批处理以避免内存问题和请求超时
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 配置
const BATCH_SIZE = 1000;
const DELAY_BETWEEN_BATCHES = 100;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const PROGRESS_FILE = path.join(__dirname, '.import-progress.json');
const DICTIONARY_FILE = path.join(__dirname, '..', 'dictionary_500k.jsonl');

// Supabase 配置
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: {
    schema: 'vocab_app'
  }
});

// 加载进度
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = fs.readFileSync(PROGRESS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading progress:', error.message);
  }
  return { lastLine: 0, successCount: 0, errorCount: 0 };
}

// 保存进度
function saveProgress(progress) {
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  } catch (error) {
    console.error('Error saving progress:', error.message);
  }
}

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

// 检查单词是否已存在
async function checkExistingWords(words) {
  const wordList = words.map(w => w.word);
  const { data, error } = await supabase
    .from('dictionary')
    .select('word')
    .in('word', wordList);
  
  if (error) {
    console.error('Error checking existing words:', error.message);
    return new Set();
  }
  
  return new Set(data?.map(d => d.word) || []);
}

// 带重试的批次插入（不使用 ON CONFLICT，改为先查后插）
async function insertBatchWithRetry(batch, batchNumber, startLine) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // 1. 检查哪些单词已存在
      const existingWords = await checkExistingWords(batch);
      
      // 2. 过滤掉已存在的单词
      const newWords = batch.filter(w => !existingWords.has(w.word));
      
      if (newWords.length === 0) {
        console.log(`Batch ${batchNumber} (line ${startLine}): All ${batch.length} records already exist`);
        return { success: true, count: 0, skipped: batch.length };
      }
      
      // 3. 插入新单词
      const { data, error } = await supabase
        .from('dictionary')
        .insert(newWords);

      if (error) {
        throw error;
      }

      console.log(`Batch ${batchNumber} (line ${startLine}): Inserted ${newWords.length} records, skipped ${existingWords.size}`);
      return { success: true, count: newWords.length, skipped: existingWords.size };
    } catch (error) {
      console.error(`Batch ${batchNumber} attempt ${attempt} failed:`, error.message);
      
      if (attempt < MAX_RETRIES) {
        console.log(`Retrying in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      } else {
        console.error(`Batch ${batchNumber} failed after ${MAX_RETRIES} attempts`);
        return { success: false, count: 0, error: error.message };
      }
    }
  }
}

// 主函数
async function importDictionary() {
  console.log('Starting dictionary import (resumable)...');
  console.log('File:', DICTIONARY_FILE);

  // 检查文件是否存在
  if (!fs.existsSync(DICTIONARY_FILE)) {
    console.error('Error: Dictionary file not found:', DICTIONARY_FILE);
    process.exit(1);
  }

  // 加载之前的进度
  const progress = loadProgress();
  console.log(`Resuming from line ${progress.lastLine}`);
  console.log(`Previous run: ${progress.successCount} success, ${progress.errorCount} errors`);

  // 读取文件
  const fileContent = fs.readFileSync(DICTIONARY_FILE, 'utf-8');
  const lines = fileContent.split('\n').filter(line => line.trim());

  console.log(`Total lines to process: ${lines.length}`);
  console.log(`Remaining: ${lines.length - progress.lastLine}`);

  // 统计
  let successCount = progress.successCount;
  let errorCount = progress.errorCount;
  let batchNumber = 0;
  let currentBatch = [];
  let currentBatchStartLine = progress.lastLine;

  // 跳过已处理的行
  for (let i = progress.lastLine; i < lines.length; i++) {
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
      console.log(`\nProcessing batch ${batchNumber} (line ${currentBatchStartLine + 1} to ${i + 1})...`);

      const result = await insertBatchWithRetry(currentBatch, batchNumber, currentBatchStartLine + 1);
      
      if (result.success) {
        successCount += result.count;
        progress.lastLine = i + 1;
        progress.successCount = successCount;
        progress.errorCount = errorCount;
        saveProgress(progress);
      } else {
        errorCount += currentBatch.length;
        console.error(`Batch failed, continuing to next batch...`);
      }

      // 清空批次
      currentBatch = [];
      currentBatchStartLine = i + 1;

      // 延迟避免请求过快
      if (i < lines.length - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }

      // 每 10 批显示进度
      if (batchNumber % 10 === 0) {
        const progressPercent = ((i + 1) / lines.length * 100).toFixed(2);
        console.log(`\n=== Progress: ${progressPercent}% (${i + 1}/${lines.length}) ===`);
        console.log(`Success: ${successCount}, Errors: ${errorCount}`);
      }
    }
  }

  // 清理进度文件
  if (fs.existsSync(PROGRESS_FILE)) {
    fs.unlinkSync(PROGRESS_FILE);
    console.log('\nProgress file cleaned up');
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
