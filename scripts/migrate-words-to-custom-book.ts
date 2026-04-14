/**
 * 数据迁移脚本：将用户添加的单词迁移到"自定义单词书"
 * 
 * 运行方式：npx ts-node scripts/migrate-words-to-custom-book.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: 请设置 SUPABASE_URL 和 SUPABASE_PUBLISHABLE_KEY 环境变量');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'vocab_app' },
});

async function migrateWordsToCustomBook() {
  console.log('开始迁移用户单词到自定义单词书...\n');

  try {
    // 1. 获取所有有单词的用户
    const { data: userWords, error: wordsError } = await supabase
      .from('words')
      .select('user_id')
      .not('user_id', 'is', null)
      .order('user_id');

    if (wordsError) throw wordsError;

    // 去重获取所有用户ID
    const userIds = [...new Set(userWords?.map(w => w.user_id) || [])];
    console.log(`找到 ${userIds.length} 个有单词的用户\n`);

    for (const userId of userIds) {
      console.log(`处理用户: ${userId}`);

      // 2. 查找或创建"自定义单词书"
      let { data: customBooks } = await supabase
        .from('word_books')
        .select('*')
        .eq('user_id', userId)
        .eq('name', '自定义单词书')
        .eq('source_type', 'custom')
        .single();

      let customBookId: string;

      if (!customBooks) {
        // 创建自定义单词书
        const { data: newBook, error: createError } = await supabase
          .from('word_books')
          .insert({
            user_id: userId,
            name: '自定义单词书',
            description: '用户手动添加的单词集合',
            source_type: 'custom',
            is_active: true,
          })
          .select()
          .single();

        if (createError) {
          console.error(`  创建单词书失败: ${createError.message}`);
          continue;
        }

        customBookId = newBook!.id;
        console.log(`  创建新的自定义单词书: ${customBookId}`);

        // 检查用户是否已有学习序列
        const { data: existingSequence } = await supabase
          .from('user_learning_sequences')
          .select('*')
          .eq('user_id', userId)
          .limit(1);

        // 添加到学习序列（如果是第一个，设为 primary）
        const { error: sequenceError } = await supabase
          .from('user_learning_sequences')
          .insert({
            user_id: userId,
            word_book_id: customBookId,
            is_primary: !existingSequence || existingSequence.length === 0,
          });

        if (sequenceError) {
          console.error(`  添加到学习序列失败: ${sequenceError.message}`);
        } else {
          console.log(`  已添加到学习序列`);
        }
      } else {
        customBookId = customBooks.id;
        console.log(`  使用现有自定义单词书: ${customBookId}`);
      }

      // 3. 获取该用户的所有单词
      const { data: words, error: userWordsError } = await supabase
        .from('words')
        .select('id')
        .eq('user_id', userId);

      if (userWordsError) {
        console.error(`  获取单词失败: ${userWordsError.message}`);
        continue;
      }

      console.log(`  该用户有 ${words?.length || 0} 个单词`);

      // 4. 检查哪些单词已经在单词书中
      const { data: existingItems } = await supabase
        .from('word_book_items')
        .select('word_id')
        .eq('word_book_id', customBookId);

      const existingWordIds = new Set(existingItems?.map(item => item.word_id) || []);
      const wordsToAdd = words?.filter(w => !existingWordIds.has(w.id)) || [];

      console.log(`  需要迁移 ${wordsToAdd.length} 个新单词`);

      // 5. 批量添加单词到单词书
      if (wordsToAdd.length > 0) {
        const itemsToInsert = wordsToAdd.map(word => ({
          word_book_id: customBookId,
          word_id: word.id,
          status: 'new',
          source_type: 'custom',
        }));

        const { error: insertError } = await supabase
          .from('word_book_items')
          .insert(itemsToInsert);

        if (insertError) {
          console.error(`  添加单词到单词书失败: ${insertError.message}`);
        } else {
          console.log(`  成功迁移 ${wordsToAdd.length} 个单词\n`);
        }
      } else {
        console.log(`  没有需要迁移的新单词\n`);
      }
    }

    console.log('\n迁移完成！');
  } catch (error) {
    console.error('迁移过程中出错:', error);
    process.exit(1);
  }
}

// 运行迁移
migrateWordsToCustomBook();
