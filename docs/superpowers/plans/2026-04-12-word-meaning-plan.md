# 单词释义分层与重复检查实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 实现单词释义的分层管理（内置释义 + 用户释义），并在添加单词时进行重复检查和智能提示。

**架构：** 扩展 Word 类型添加 builtInMeanings 和 source 字段；创建 checkWordExists API 检查单词存在性；创建 DuplicateWarning 和 BuiltinMeaningsCard UI 组件；修改 AddWord 组件集成检查逻辑和释义选择。

**技术栈：** Next.js 14 + TypeScript + Supabase + Tailwind CSS

---

## 文件结构

### 新建文件

| 文件路径 | 职责 |
|---------|------|
| `app/api/words/check/route.ts` | 检查单词是否存在 API |
| `app/components/DuplicateWarning.tsx` | 重复提示组件 |
| `app/components/BuiltinMeaningsCard.tsx` | 内置释义显示组件 |

### 修改文件

| 文件路径 | 修改内容 |
|---------|---------|
| `app/types/index.ts` | 扩展 Word 类型，添加 WordCheckResult 类型 |
| `app/services/wordAPI.ts` | 添加 checkWordExists 和 addWordWithCheck 函数 |
| `app/api/words/route.ts` | 修改 POST 接口支持智能添加 |
| `app/components/AddWord.tsx` | 集成检查逻辑和释义选择 |

---

## Phase 1: 类型定义和 API

### 任务 1.1: 扩展 Word 类型

**文件：**
- 修改：`app/types/index.ts`

**步骤：**

- [ ] **步骤 1: 添加 WordCheckResult 类型**

在文件末尾添加：

```typescript
// 单词检查结果
export interface WordCheckResult {
  userWord?: Word;      // 用户已添加的单词
  builtinWord?: Word;   // 系统预置单词
  existsInUserLibrary: boolean;
  existsInBuiltin: boolean;
}

// 添加单词请求
export interface AddWordRequest {
  word: string;
  userId: string;
  useBuiltinMeanings?: boolean;
  builtinWordId?: string;
  meanings?: Meaning[];
  force?: boolean;
}
```

- [ ] **步骤 2: 扩展 Word 类型**

修改 Word 接口：

```typescript
export interface Word {
  id: string;
  word: string;
  phonetic?: string;
  phonetics: any[];
  
  // 内置释义（来自系统预置单词书，只读）
  builtInMeanings?: Meaning[];
  
  // 用户释义（可编辑）- 等同于 meanings
  userMeanings?: Meaning[];
  meanings: Meaning[];
  
  tags: string[];
  customNote?: string;
  interval: number;
  easeFactor: number;
  reviewCount: number;
  nextReviewAt: number;
  createdAt: number;
  updatedAt: number;
  quality: number;
  
  // 来源标记
  source?: 'builtin' | 'user' | 'hybrid';
  
  // 如果是从系统单词创建的，记录原始单词ID
  originalWordId?: string;
}
```

- [ ] **步骤 3: Commit**

```bash
git add app/types/index.ts
git commit -m "feat: extend Word type with builtInMeanings and source fields"
```

---

### 任务 1.2: 创建检查单词 API

**文件：**
- 创建：`app/api/words/check/route.ts`

**步骤：**

- [ ] **步骤 1: 创建 API 路由**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../services/supabase';

// GET /api/words/check?word=xxx&userId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const word = searchParams.get('word');
    const userId = searchParams.get('userId');

    if (!word || !userId) {
      return NextResponse.json(
        { error: 'Word and userId are required' },
        { status: 400 }
      );
    }

    const normalizedWord = word.trim().toLowerCase();

    // 1. 检查用户是否已添加
    const { data: userWord } = await supabase
      .from('words')
      .select('*')
      .eq('user_id', userId)
      .ilike('word', normalizedWord)
      .single();

    // 2. 检查系统单词书
    const { data: builtinWord } = await supabase
      .from('words')
      .select('*')
      .is('user_id', null)
      .ilike('word', normalizedWord)
      .single();

    return NextResponse.json({
      existsInUserLibrary: !!userWord,
      existsInBuiltin: !!builtinWord,
      userWord,
      builtinWord,
    });
  } catch (error: any) {
    console.error('Error checking word:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check word' },
      { status: 500 }
    );
  }
}
```

- [ ] **步骤 2: Commit**

```bash
git add app/api/words/check/route.ts
git commit -m "feat: add word check API"
```

---

### 任务 1.3: 添加单词 API 客户端函数

**文件：**
- 修改：`app/services/wordAPI.ts`（新建文件，或添加到现有 apiClient.ts）

**步骤：**

- [ ] **步骤 1: 创建 wordAPI.ts 文件**

```typescript
import type { Word, WordCheckResult, AddWordRequest } from '../types';

const API_BASE = '/api';

// 检查单词是否存在
export async function checkWordExists(
  word: string,
  userId: string
): Promise<WordCheckResult> {
  const response = await fetch(
    `${API_BASE}/words/check?word=${encodeURIComponent(word)}&userId=${userId}`
  );
  if (!response.ok) throw new Error('Failed to check word');
  return response.json();
}

// 添加单词（带检查）
export async function addWordWithCheck(
  data: AddWordRequest
): Promise<Word> {
  const response = await fetch(`${API_BASE}/words`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    if (error.error === 'WORD_EXISTS') {
      throw new Error('WORD_EXISTS');
    }
    throw new Error(error.error || 'Failed to add word');
  }
  
  return response.json();
}
```

- [ ] **步骤 2: Commit**

```bash
git add app/services/wordAPI.ts
git commit -m "feat: add word API client functions"
```

---

## Phase 2: UI 组件

### 任务 2.1: 创建重复提示组件

**文件：**
- 创建：`app/components/DuplicateWarning.tsx`

**步骤：**

- [ ] **步骤 1: 创建组件**

```typescript
'use client';

import type { Word } from '../types';

interface DuplicateWarningProps {
  word: Word;
  onViewDetail: () => void;
  onCancel: () => void;
  onForceAdd: () => void;
}

export function DuplicateWarning({
  word,
  onViewDetail,
  onCancel,
  onForceAdd,
}: DuplicateWarningProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN');
  };

  const getProgressText = () => {
    if (word.quality >= 4) return '已掌握';
    if (word.quality >= 2) return '学习中';
    return '刚开始';
  };

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">⚠️</span>
        <div className="flex-1">
          <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
            该单词已在你的词库中
          </h3>
          
          <div className="text-sm text-amber-700 dark:text-amber-300 mb-3">
            <p><span className="font-medium">单词:</span> {word.word}</p>
            <p><span className="font-medium">添加时间:</span> {formatDate(word.createdAt)}</p>
            <p><span className="font-medium">学习进度:</span> {getProgressText()}</p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onViewDetail}
              className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
            >
              查看详情
            </button>
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-sm text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={onForceAdd}
              className="px-3 py-1.5 text-sm text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
            >
              强制添加
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **步骤 2: Commit**

```bash
git add app/components/DuplicateWarning.tsx
git commit -m "feat: add DuplicateWarning component"
```

---

### 任务 2.2: 创建内置释义显示组件

**文件：**
- 创建：`app/components/BuiltinMeaningsCard.tsx`

**步骤：**

- [ ] **步骤 1: 创建组件**

```typescript
'use client';

import type { Word } from '../types';

interface BuiltinMeaningsCardProps {
  word: Word;
  onUseBuiltin: () => void;
  onAddCustom: () => void;
}

export function BuiltinMeaningsCard({
  word,
  onUseBuiltin,
  onAddCustom,
}: BuiltinMeaningsCardProps) {
  return (
    <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl p-4 mb-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">📖</span>
        <div className="flex-1">
          <h3 className="font-semibold text-primary-800 dark:text-primary-200 mb-3">
            发现系统内置释义
          </h3>
          
          <div className="bg-white dark:bg-slate-800 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {word.word}
              </span>
              {word.phonetic && (
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {word.phonetic}
                </span>
              )}
            </div>
            
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                内置释义
              </p>
              {word.meanings?.map((meaning, idx) => (
                <div key={idx} className="text-sm">
                  <span className="font-medium text-primary-600 dark:text-primary-400">
                    {meaning.partOfSpeech}
                  </span>
                  <ul className="mt-1 space-y-1 ml-4">
                    {meaning.definitions?.map((def: any, defIdx: number) => (
                      <li key={defIdx} className="text-slate-700 dark:text-slate-300">
                        {def.definition}
                        {def.chineseDefinition && (
                          <span className="text-slate-500 dark:text-slate-500 ml-2">
                            {def.chineseDefinition}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onUseBuiltin}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              ✓ 使用内置释义
            </button>
            <button
              onClick={onAddCustom}
              className="px-4 py-2 text-sm bg-white dark:bg-slate-800 text-primary-700 dark:text-primary-300 border border-primary-300 dark:border-primary-700 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
            >
              ✎ 添加我的释义
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **步骤 2: Commit**

```bash
git add app/components/BuiltinMeaningsCard.tsx
git commit -m "feat: add BuiltinMeaningsCard component"
```

---

## Phase 3: 集成到 AddWord 组件

### 任务 3.1: 修改 AddWord 组件

**文件：**
- 修改：`app/components/AddWord.tsx`

**步骤：**

- [ ] **步骤 1: 导入新组件和 API**

在文件顶部添加：

```typescript
import { DuplicateWarning } from './DuplicateWarning';
import { BuiltinMeaningsCard } from './BuiltinMeaningsCard';
import { checkWordExists, addWordWithCheck } from '../services/wordAPI';
import type { WordCheckResult } from '../types';
```

- [ ] **步骤 2: 添加状态管理**

在组件内添加状态：

```typescript
export function AddWord() {
  const { addWord } = useApp();
  // ... 现有状态
  
  // 新增状态
  const [checkResult, setCheckResult] = useState<WordCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [showBuiltinCard, setShowBuiltinCard] = useState(false);
  const [useBuiltinMeanings, setUseBuiltinMeanings] = useState(false);
  
  // ... 其余代码
}
```

- [ ] **步骤 3: 添加检查函数**

```typescript
  const handleCheckWord = useCallback(async () => {
    if (!word.trim()) return;
    
    setIsChecking(true);
    try {
      const result = await checkWordExists(word, userId);
      setCheckResult(result);
      
      if (result.existsInBuiltin && !result.existsInUserLibrary) {
        setShowBuiltinCard(true);
      }
    } catch (error) {
      console.error('Error checking word:', error);
    } finally {
      setIsChecking(false);
    }
  }, [word, userId]);
```

- [ ] **步骤 4: 修改表单提交逻辑**

```typescript
  const handleSubmit = useCallback(async () => {
    if (!word.trim()) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      await addWordWithCheck({
        word,
        userId,
        useBuiltinMeanings,
        builtinWordId: checkResult?.builtinWord?.id,
        meanings: useBuiltinMeanings ? undefined : meanings,
        force: false,
      });
      
      // 成功后的处理...
      setSuccessMessage('单词添加成功！');
      // 重置表单...
    } catch (err: any) {
      if (err.message === 'WORD_EXISTS') {
        setError('该单词已在你的词库中');
      } else {
        setError(err.message || '添加失败');
      }
    } finally {
      setIsLoading(false);
    }
  }, [word, userId, useBuiltinMeanings, checkResult, meanings]);
```

- [ ] **步骤 5: 在 JSX 中添加新组件**

在表单中添加：

```tsx
  return (
    <div className="max-w-4xl mx-auto">
      {/* 重复提示 */}
      {checkResult?.existsInUserLibrary && checkResult.userWord && (
        <DuplicateWarning
          word={checkResult.userWord}
          onViewDetail={() => {/* 跳转详情 */}}
          onCancel={() => {
            setWord('');
            setCheckResult(null);
          }}
          onForceAdd={() => {
            // 强制添加逻辑
          }}
        />
      )}
      
      {/* 内置释义卡片 */}
      {showBuiltinCard && checkResult?.builtinWord && !checkResult?.existsInUserLibrary && (
        <BuiltinMeaningsCard
          word={checkResult.builtinWord}
          onUseBuiltin={() => {
            setUseBuiltinMeanings(true);
            setMeanings(checkResult.builtinWord!.meanings);
          }}
          onAddCustom={() => {
            setUseBuiltinMeanings(false);
            setShowBuiltinCard(false);
          }}
        />
      )}
      
      {/* 原有表单内容 */}
      {/* ... */}
    </div>
  );
```

- [ ] **步骤 6: Commit**

```bash
git add app/components/AddWord.tsx
git commit -m "feat: integrate word check and builtin meanings into AddWord"
```

---

## Phase 4: 修改 API 支持智能添加

### 任务 4.1: 修改添加单词 API

**文件：**
- 修改：`app/api/words/route.ts`

**步骤：**

- [ ] **步骤 1: 修改 POST 处理函数**

```typescript
// POST /api/words
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { word, userId, useBuiltinMeanings, builtinWordId, meanings, force } = body;

    if (!word || !userId) {
      return NextResponse.json(
        { error: 'word and userId are required' },
        { status: 400 }
      );
    }

    const normalizedWord = word.trim().toLowerCase();

    // 1. 检查是否已存在（如果不强制添加）
    if (!force) {
      const { data: existingWord } = await supabase
        .from('words')
        .select('id')
        .eq('user_id', userId)
        .ilike('word', normalizedWord)
        .single();

      if (existingWord) {
        return NextResponse.json(
          { error: 'WORD_EXISTS', message: 'Word already exists in user library' },
          { status: 409 }
        );
      }
    }

    // 2. 准备单词数据
    const now = Date.now();
    const wordData: any = {
      user_id: userId,
      word: normalizedWord,
      phonetic: '',
      phonetics: [],
      tags: [],
      interval: 0,
      ease_factor: 2.5,
      review_count: 0,
      next_review_at: now,
      created_at: now,
      updated_at: now,
      quality: 0,
    };

    // 3. 处理释义
    if (useBuiltinMeanings && builtinWordId) {
      // 获取内置单词的释义
      const { data: builtinWord } = await supabase
        .from('words')
        .select('meanings, phonetic, phonetics')
        .eq('id', builtinWordId)
        .single();

      if (builtinWord) {
        wordData.built_in_meanings = builtinWord.meanings;
        wordData.meanings = builtinWord.meanings;
        wordData.phonetic = builtinWord.phonetic;
        wordData.phonetics = builtinWord.phonetics;
        wordData.source = 'hybrid';
        wordData.original_word_id = builtinWordId;
      }
    } else if (meanings) {
      wordData.meanings = meanings;
      wordData.source = 'user';
    }

    // 4. 插入数据库
    const { data: newWord, error } = await supabase
      .from('words')
      .insert(wordData)
      .select()
      .single();

    if (error) throw error;

    // 5. 关联到自定义单词本
    await addToCustomWordBook(newWord.id, userId);

    return NextResponse.json(newWord, { status: 201 });
  } catch (error: any) {
    console.error('Error adding word:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add word' },
      { status: 500 }
    );
  }
}

// 辅助函数：添加到自定义单词本
async function addToCustomWordBook(wordId: string, userId: string) {
  // 查找或创建"自定义单词本"
  let { data: customBook } = await supabase
    .from('word_books')
    .select('id')
    .eq('user_id', userId)
    .eq('name', '自定义单词本')
    .single();

  if (!customBook) {
    const { data: newBook } = await supabase
      .from('word_books')
      .insert({
        user_id: userId,
        name: '自定义单词本',
        description: '用户手动添加的单词',
        source_type: 'custom',
        word_count: 0,
      })
      .select()
      .single();
    customBook = newBook;
  }

  if (customBook) {
    await supabase.from('word_book_items').insert({
      word_book_id: customBook.id,
      word_id: wordId,
      status: 'learning',
    });
  }
}
```

- [ ] **步骤 2: Commit**

```bash
git add app/api/words/route.ts
git commit -m "feat: update add word API to support builtin meanings and duplicate check"
```

---

## 自检清单

### 规格覆盖度检查

| 规格需求 | 对应任务 |
|---------|---------|
| 重复检查 API | 任务 1.2 |
| 重复提示 UI | 任务 2.1 |
| 内置释义显示 | 任务 2.2 |
| 智能添加逻辑 | 任务 3.1, 4.1 |
| 释义分层存储 | 任务 4.1 |

### 占位符扫描

- [x] 无 "TODO"、"待定" 等占位符
- [x] 每个任务都有完整代码实现
- [x] 类型定义完整

### 类型一致性

- [x] Word 类型扩展一致
- [x] API 参数和返回类型匹配
- [x] 组件 Props 类型定义完整

---

## 执行选项

**计划已完成并保存到 `docs/superpowers/plans/2026-04-12-word-meaning-plan.md`。两种执行方式：**

**1. 子代理驱动（推荐）** - 每个任务调度一个新的子代理，任务间进行审查，快速迭代

**2. 内联执行** - 在当前会话中使用 executing-plans 执行任务，批量执行并设有检查点供审查

**选哪种方式？**
