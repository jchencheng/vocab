/**
 * 迁移现有数据到新的 dictionary 架构（支持断点续传）
 * 1. 将现有内置单词匹配到 dictionary
 * 2. 更新 words 表的 source_type 和 source_word_id
 * 3. 迁移单词书数据
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

// 配置
const BATCH_SIZE = 100;
const PROGRESS_FILE = path.join(__dirname, '.migration-progress.json');
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

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
  return {
    builtinWords: { completed: false, lastIndex: 0, matched: 0, unmatched: 0 },
    userWords: { completed: false, lastIndex: 0, matched: 0 },
    wordBooks: { completed: false, lastIndex: 0, migrated: 0 }
  };
}

// 保存进度
function saveProgress(progress) {
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  } catch (error) {
    console.error('Error saving progress:', error.message);
  }
}

// 带重试的数据库操作
async function withRetry(operation, name, maxRetries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`${name} attempt ${attempt} failed:`, error.message);
      if (attempt < maxRetries) {
        console.log(`Retrying in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      } else {
        throw error;
      }
    }
  }
}

// 迁移内置单词
async function migrateBuiltinWords(progress) {
  console.log('\n=== Migrating builtin words ===');

  if (progress.builtinWords.completed) {
    console.log('Builtin words already migrated, skipping...');
    return;
  }

  // 获取所有内置单词
  const { data: builtinWords, error: fetchError } = await withRetry(
    () => supabase
      .from('words')
      .select('id, word, phonetic, meanings')
      .is('user_id', null),
    'Fetch builtin words'
  );

  if (fetchError) {
    console.error('Error fetching builtin words:', fetchError.message);
    return;
  }

  console.log(`Found ${builtinWords?.length || 0} builtin words`);

  if (!builtinWords || builtinWords.length === 0) {
    progress.builtinWords.completed = true;
    saveProgress(progress);
    return;
  }

  let matchedCount = progress.builtinWords.matched;
  let unmatchedCount = progress.builtinWords.unmatched;

  for (let i = progress.builtinWords.lastIndex; i < builtinWords.length; i++) {
    const word = builtinWords[i];

    try {
      // 查询 dictionary
      const { data: dictWord, error: dictError } = await withRetry(
        () => supabase
          .from('dictionary')
          .select('id')
          .ilike('word', word.word)
          .single(),
        `Query dictionary for ${word.word}`
      );

      if (dictError || !dictWord) {
        console.log(`No match for word: ${word.word}`);
        unmatchedCount++;
      } else {
        // 更新 words 表
        const { error: updateError } = await withRetry(
          () => supabase
            .from('words')
            .update({
              source_type: 'dictionary',
              source_word_id: dictWord.id
            })
            .eq('id', word.id),
          `Update word ${word.word}`
        );

        if (updateError) {
          console.error(`Error updating word ${word.word}:`, updateError.message);
          unmatchedCount++;
        } else {
          matchedCount++;
        }
      }
    } catch (error) {
      console.error(`Failed to process word ${word.word}:`, error.message);
      unmatchedCount++;
    }

    // 每 10 条保存一次进度
    if ((i + 1) % 10 === 0 || i === builtinWords.length - 1) {
      progress.builtinWords.lastIndex = i + 1;
      progress.builtinWords.matched = matchedCount;
      progress.builtinWords.unmatched = unmatchedCount;
      saveProgress(progress);
      console.log(`Progress: ${i + 1}/${builtinWords.length} (matched: ${matchedCount}, unmatched: ${unmatchedCount})`);
    }
  }

  progress.builtinWords.completed = true;
  saveProgress(progress);
  console.log(`Migration complete: ${matchedCount} matched, ${unmatchedCount} unmatched`);
}

// 迁移用户单词
async function migrateUserWords(progress) {
  console.log('\n=== Migrating user words ===');

  if (progress.userWords.completed) {
    console.log('User words already migrated, skipping...');
    return;
  }

  // 获取所有用户单词（分批）
  let allUserWords = [];
  let page = 0;

  while (true) {
    const { data: userWords, error: fetchError } = await withRetry(
      () => supabase
        .from('words')
        .select('id, word')
        .not('user_id', 'is', null)
        .is('source_word_id', null)
        .range(page * 1000, (page + 1) * 1000 - 1),
      `Fetch user words page ${page}`
    );

    if (fetchError) {
      console.error('Error fetching user words:', fetchError.message);
      break;
    }

    if (!userWords || userWords.length === 0) break;

    allUserWords = allUserWords.concat(userWords);
    page++;

    if (userWords.length < 1000) break;
  }

  console.log(`Found ${allUserWords.length} user words to check`);

  if (allUserWords.length === 0) {
    progress.userWords.completed = true;
    saveProgress(progress);
    return;
  }

  let matchedCount = progress.userWords.matched;

  for (let i = progress.userWords.lastIndex; i < allUserWords.length; i++) {
    const word = allUserWords[i];

    try {
      // 查询 dictionary
      const { data: dictWord, error: dictError } = await withRetry(
        () => supabase
          .from('dictionary')
          .select('id')
          .ilike('word', word.word)
          .single(),
        `Query dictionary for ${word.word}`
      );

      if (!dictError && dictWord) {
        // 更新为引用 dictionary
        const { error: updateError } = await withRetry(
          () => supabase
            .from('words')
            .update({
              source_type: 'dictionary',
              source_word_id: dictWord.id
            })
            .eq('id', word.id),
          `Update user word ${word.word}`
        );

        if (!updateError) {
          matchedCount++;
        }
      }
    } catch (error) {
      console.error(`Failed to process user word ${word.word}:`, error.message);
    }

    // 每 10 条保存一次进度
    if ((i + 1) % 10 === 0 || i === allUserWords.length - 1) {
      progress.userWords.lastIndex = i + 1;
      progress.userWords.matched = matchedCount;
      saveProgress(progress);
      console.log(`Progress: ${i + 1}/${allUserWords.length} (matched: ${matchedCount})`);
    }
  }

  progress.userWords.completed = true;
  saveProgress(progress);
  console.log(`Updated ${matchedCount} user words to reference dictionary`);
}

// 迁移单词书
async function migrateWordBooks(progress) {
  console.log('\n=== Migrating word books ===');

  if (progress.wordBooks.completed) {
    console.log('Word books already migrated, skipping...');
    return;
  }

  // 1. 更新系统单词书的 source_type
  try {
    const { error: updateError } = await withRetry(
      () => supabase
        .from('word_books')
        .update({ source_type: 'system', user_id: null })
        .is('user_id', null),
      'Update word books source_type'
    );

    if (updateError) {
      console.error('Error updating word books:', updateError.message);
    } else {
      console.log('Updated word books source_type');
    }
  } catch (error) {
    console.error('Failed to update word books:', error.message);
  }

  // 2. 迁移单词书条目（分批）
  let allItems = [];
  let page = 0;

  while (true) {
    const { data: items, error: fetchError } = await withRetry(
      () => supabase
        .from('word_book_items')
        .select('id, word_id, word_book_id')
        .is('dictionary_id', null)
        .range(page * 1000, (page + 1) * 1000 - 1),
      `Fetch word book items page ${page}`
    );

    if (fetchError) {
      console.error('Error fetching word book items:', fetchError.message);
      break;
    }

    if (!items || items.length === 0) break;

    allItems = allItems.concat(items);
    page++;

    if (items.length < 1000) break;
  }

  console.log(`Found ${allItems.length} word book items to migrate`);

  if (allItems.length === 0) {
    progress.wordBooks.completed = true;
    saveProgress(progress);
    return;
  }

  let migratedCount = progress.wordBooks.migrated;

  for (let i = progress.wordBooks.lastIndex; i < allItems.length; i++) {
    const item = allItems[i];

    try {
      // 获取对应的 word
      const { data: word, error: wordError } = await withRetry(
        () => supabase
          .from('words')
          .select('source_type, source_word_id, word')
          .eq('id', item.word_id)
          .single(),
        `Fetch word for item ${item.id}`
      );

      if (wordError || !word) {
        continue;
      }

      // 如果 word 引用了 dictionary，则更新 word_book_items
      if (word.source_type === 'dictionary' && word.source_word_id) {
        const { error: updateError } = await withRetry(
          () => supabase
            .from('word_book_items')
            .update({
              source_type: 'dictionary',
              dictionary_id: word.source_word_id,
              word_id: null
            })
            .eq('id', item.id),
          `Update word book item ${item.id}`
        );

        if (!updateError) {
          migratedCount++;
        }
      }
    } catch (error) {
      console.error(`Failed to process word book item ${item.id}:`, error.message);
    }

    // 每 10 条保存一次进度
    if ((i + 1) % 10 === 0 || i === allItems.length - 1) {
      progress.wordBooks.lastIndex = i + 1;
      progress.wordBooks.migrated = migratedCount;
      saveProgress(progress);
      console.log(`Progress: ${i + 1}/${allItems.length} (migrated: ${migratedCount})`);
    }
  }

  progress.wordBooks.completed = true;
  saveProgress(progress);
  console.log(`Migrated ${migratedCount} word book items to reference dictionary`);
}

// 主函数
async function main() {
  console.log('Starting data migration (resumable)...');
  console.log('Supabase URL:', SUPABASE_URL);

  const progress = loadProgress();
  console.log('Loaded progress:', JSON.stringify(progress, null, 2));

  await migrateBuiltinWords(progress);
  await migrateUserWords(progress);
  await migrateWordBooks(progress);

  // 清理进度文件
  if (fs.existsSync(PROGRESS_FILE)) {
    fs.unlinkSync(PROGRESS_FILE);
    console.log('\nProgress file cleaned up');
  }

  console.log('\n========================================');
  console.log('Migration completed!');
  console.log('========================================');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
