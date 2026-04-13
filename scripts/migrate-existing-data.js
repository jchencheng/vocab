/**
 * 迁移现有数据到新的 dictionary 架构
 * 1. 将现有内置单词（user_id IS NULL）匹配到 dictionary
 * 2. 更新 words 表的 source_type 和 source_word_id
 * 3. 迁移单词书数据
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase 配置
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 分批处理大小
const BATCH_SIZE = 500;

// 迁移内置单词
async function migrateBuiltinWords() {
  console.log('\n=== Migrating builtin words ===');

  // 1. 获取所有内置单词（user_id IS NULL）
  const { data: builtinWords, error: fetchError } = await supabase
    .from('words')
    .select('id, word, phonetic, meanings')
    .is('user_id', null);

  if (fetchError) {
    console.error('Error fetching builtin words:', fetchError.message);
    return;
  }

  console.log(`Found ${builtinWords?.length || 0} builtin words`);

  if (!builtinWords || builtinWords.length === 0) {
    console.log('No builtin words to migrate');
    return;
  }

  // 2. 匹配 dictionary 并更新
  let matchedCount = 0;
  let unmatchedCount = 0;

  for (const word of builtinWords) {
    // 查询 dictionary 中是否存在
    const { data: dictWord, error: dictError } = await supabase
      .from('dictionary')
      .select('id')
      .ilike('word', word.word)
      .single();

    if (dictError || !dictWord) {
      console.log(`No match for word: ${word.word}`);
      unmatchedCount++;
      continue;
    }

    // 更新 words 表
    const { error: updateError } = await supabase
      .from('words')
      .update({
        source_type: 'dictionary',
        source_word_id: dictWord.id
      })
      .eq('id', word.id);

    if (updateError) {
      console.error(`Error updating word ${word.word}:`, updateError.message);
      unmatchedCount++;
    } else {
      matchedCount++;
    }
  }

  console.log(`Migration complete: ${matchedCount} matched, ${unmatchedCount} unmatched`);
}

// 迁移用户单词（尝试匹配 dictionary）
async function migrateUserWords() {
  console.log('\n=== Migrating user words ===');

  // 获取所有用户单词
  const { data: userWords, error: fetchError } = await supabase
    .from('words')
    .select('id, word')
    .not('user_id', 'is', null)
    .is('source_word_id', null); // 还未迁移的

  if (fetchError) {
    console.error('Error fetching user words:', fetchError.message);
    return;
  }

  console.log(`Found ${userWords?.length || 0} user words to check`);

  if (!userWords || userWords.length === 0) {
    console.log('No user words to migrate');
    return;
  }

  let matchedCount = 0;

  for (const word of userWords) {
    // 查询 dictionary
    const { data: dictWord, error: dictError } = await supabase
      .from('dictionary')
      .select('id')
      .ilike('word', word.word)
      .single();

    if (!dictError && dictWord) {
      // 更新为引用 dictionary
      const { error: updateError } = await supabase
        .from('words')
        .update({
          source_type: 'dictionary',
          source_word_id: dictWord.id
        })
        .eq('id', word.id);

      if (!updateError) {
        matchedCount++;
      }
    }
  }

  console.log(`Updated ${matchedCount} user words to reference dictionary`);
}

// 迁移单词书
async function migrateWordBooks() {
  console.log('\n=== Migrating word books ===');

  // 1. 更新系统单词书的 source_type
  const { error: updateError } = await supabase
    .from('word_books')
    .update({ source_type: 'system', user_id: null })
    .is('user_id', null);

  if (updateError) {
    console.error('Error updating word books:', updateError.message);
    return;
  }

  console.log('Updated word books source_type');

  // 2. 迁移单词书条目
  // 获取所有单词书条目
  const { data: items, error: fetchError } = await supabase
    .from('word_book_items')
    .select('id, word_id, word_book_id')
    .is('dictionary_id', null);

  if (fetchError) {
    console.error('Error fetching word book items:', fetchError.message);
    return;
  }

  console.log(`Found ${items?.length || 0} word book items to migrate`);

  if (!items || items.length === 0) {
    return;
  }

  let migratedCount = 0;

  for (const item of items) {
    // 获取对应的 word
    const { data: word, error: wordError } = await supabase
      .from('words')
      .select('source_type, source_word_id, word')
      .eq('id', item.word_id)
      .single();

    if (wordError || !word) {
      continue;
    }

    // 如果 word 引用了 dictionary，则更新 word_book_items
    if (word.source_type === 'dictionary' && word.source_word_id) {
      const { error: updateError } = await supabase
        .from('word_book_items')
        .update({
          source_type: 'dictionary',
          dictionary_id: word.source_word_id,
          word_id: null // 清除 word_id，因为现在引用 dictionary
        })
        .eq('id', item.id);

      if (!updateError) {
        migratedCount++;
      }
    }
  }

  console.log(`Migrated ${migratedCount} word book items to reference dictionary`);
}

// 主函数
async function main() {
  console.log('Starting data migration...');
  console.log('Supabase URL:', SUPABASE_URL);

  await migrateBuiltinWords();
  await migrateUserWords();
  await migrateWordBooks();

  console.log('\n========================================');
  console.log('Migration completed!');
  console.log('========================================');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
