/**
 * TE Vocab 导入脚本
 * 将 te_vocab_filtered_v6.xlsx 中的单词导入为系统预置单词书
 * 
 * 使用方法:
 * 1. 确保已安装依赖: npm install xlsx
 * 2. 设置环境变量（在 .env.local 中已配置）:
 *    - SUPABASE_URL: https://bmvtpdofmnbrymosrwhy.supabase.co
 *    - SUPABASE_SECRET_KEY: 你的 Supabase Secret Key
 * 3. 运行: npx ts-node scripts/import-te-vocab.ts
 */

import xlsx from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// 获取当前文件路径（ES 模块兼容）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载 .env.local 环境变量
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// 检查环境变量
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('错误: 请确保在 .env.local 中设置了 SUPABASE_URL 和 SUPABASE_SECRET_KEY');
  console.error('当前环境变量:');
  console.error('  SUPABASE_URL:', supabaseUrl);
  console.error('  SUPABASE_SECRET_KEY:', supabaseKey ? '已设置' : '未设置');
  process.exit(1);
}

console.log('环境变量已加载');
console.log('  SUPABASE_URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: 'vocab_app',
  },
});

interface TEVocabWord {
  word: string;
  frequency?: number;
  meaning?: string;
  [key: string]: any;
}

async function importTEVocab() {
  try {
    console.log('开始导入 TE Vocab...');

    // 检查 Excel 文件是否存在
    const filePath = path.join(__dirname, '..', 'te_vocab_filtered_v6.xlsx');
    if (!fs.existsSync(filePath)) {
      console.error(`错误: 找不到文件 ${filePath}`);
      console.log('请确保 te_vocab_filtered_v6.xlsx 存在于项目根目录');
      process.exit(1);
    }

    // 读取 Excel 文件
    console.log(`读取文件: ${filePath}`);
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet) as TEVocabWord[];

    console.log(`从 Excel 中读取到 ${data.length} 个单词`);

    if (data.length === 0) {
      console.error('错误: Excel 文件中没有数据');
      process.exit(1);
    }

    // 显示前几行数据，帮助理解结构
    console.log('\n数据样例 (前3行):');
    data.slice(0, 3).forEach((row, i) => {
      console.log(`  行 ${i + 1}:`, JSON.stringify(row));
    });

    // 检查是否已存在同名单词书
    const { data: existingBook } = await supabase
      .from('word_books')
      .select('id')
      .is('user_id', null)
      .eq('name', '经济学人高频单词')
      .single();

    if (existingBook) {
      console.log('\n注意: 已存在同名单词书');
      const { data: existingItems } = await supabase
        .from('word_book_items')
        .select('id')
        .eq('word_book_id', existingBook.id)
        .limit(1);
      
      if (existingItems && existingItems.length > 0) {
        console.log('单词书已包含单词，跳过导入');
        process.exit(0);
      } else {
        console.log('单词书存在但无单词，将添加单词...');
        await importWordsToBook(existingBook.id, data);
        process.exit(0);
      }
    }

    // 创建系统单词书
    console.log('\n创建单词书...');
    const { data: wordBook, error: bookError } = await supabase
      .from('word_books')
      .insert({
        user_id: null,
        name: '经济学人高频单词',
        description: '精选经济学人文章中的高频词汇',
        source_type: 'system',
        category: 'Reading',
        word_count: data.length,
        is_active: true
      })
      .select()
      .single();

    if (bookError) {
      throw new Error(`创建单词书失败: ${bookError.message}`);
    }

    console.log(`✅ 单词书创建成功: ${wordBook.id}`);
    console.log(`   名称: ${wordBook.name}`);
    console.log(`   单词数: ${data.length}`);

    // 导入单词到单词书
    await importWordsToBook(wordBook.id, data);

    console.log('\n✅ 导入完成!');

  } catch (error: any) {
    console.error('\n❌ 导入失败:', error.message);
    process.exit(1);
  }
}

// 延迟函数
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 带重试的 Supabase 操作
async function withRetry<T>(
  operation: () => Promise<T>,
  retries = 3,
  delayMs = 1000
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      if (i === retries - 1) throw error;
      if (error.message?.includes('502') || error.message?.includes('Bad gateway')) {
        console.log(`    遇到 502 错误，等待 ${delayMs}ms 后重试 (${i + 1}/${retries})...`);
        await delay(delayMs);
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

async function importWordsToBook(wordBookId: string, words: TEVocabWord[]) {
  console.log(`\n开始导入 ${words.length} 个单词...`);
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  // 批量处理，每批 50 个（减小批次大小）
  const batchSize = 50;
  
  for (let i = 0; i < words.length; i += batchSize) {
    const batch = words.slice(i, i + batchSize);
    console.log(`  处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(words.length / batchSize)}...`);
    
    for (const item of batch) {
      try {
        const wordText = item.word?.toString().trim().toLowerCase();
        
        if (!wordText) {
          skipCount++;
          continue;
        }
        
        // 检查单词是否已存在（系统单词，user_id 为 null）
        let { data: existingWord } = await withRetry(() =>
          supabase
            .from('words')
            .select('id')
            .is('user_id', null)
            .ilike('word', wordText)
            .single()
        );
        
        let wordId: string;
        
        if (existingWord) {
          wordId = existingWord.id;
        } else {
          // 创建新单词（基础信息）
          const now = Date.now();
          const { data: newWord, error: wordError } = await withRetry(() =>
            supabase
              .from('words')
              .insert({
                user_id: null,
                word: wordText,
                phonetic: '',
                phonetics: [],
                meanings: item.definition ? [{
                  partOfSpeech: 'noun',
                  definitions: [{
                    definition: item.definition,
                    example: ''
                  }]
                }] : [],
                tags: item.tag ? item.tag.toString().split(/\s+/) : ['TE-Vocab'],
                interval: 0,
                ease_factor: 2.5,
                review_count: 0,
                next_review_at: now,
                created_at: now,
                updated_at: now,
                quality: 0
              })
              .select()
              .single()
          );
          
          if (wordError) {
            console.error(`    创建单词 "${wordText}" 失败:`, wordError.message);
            errorCount++;
            continue;
          }
          
          wordId = newWord.id;
        }
        
        // 创建单词书条目关联
        const { error: itemError } = await withRetry(() =>
          supabase
            .from('word_book_items')
            .insert({
              word_book_id: wordBookId,
              word_id: wordId,
              status: 'learning'
            })
        );
        
        if (itemError) {
          if (itemError.code === '23505') {
            // 重复关联，忽略
            skipCount++;
          } else {
            console.error(`    关联单词 "${wordText}" 失败:`, itemError.message);
            errorCount++;
          }
        } else {
          successCount++;
        }
        
        // 添加小延迟避免请求过快
        await delay(50);
        
      } catch (error: any) {
        console.error(`    处理单词 "${item.word}" 失败:`, error.message);
        errorCount++;
      }
    }
    
    // 批次间添加延迟
    if (i + batchSize < words.length) {
      await delay(500);
    }
  }
  
  console.log(`\n  导入结果:`);
  console.log(`    ✅ 成功: ${successCount}`);
  console.log(`    ⏭️  跳过: ${skipCount}`);
  console.log(`    ❌ 错误: ${errorCount}`);
}

// 运行导入
importTEVocab();
