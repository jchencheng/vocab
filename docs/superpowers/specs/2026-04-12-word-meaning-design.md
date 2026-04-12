# 单词释义分层与重复检查设计文档

> 创建日期：2026-04-12
> 功能名称：单词释义分层与重复检查

---

## 1. 功能概述

### 1.1 目标
实现单词释义的分层管理，支持内置释义（只读）和用户释义（可编辑），并在添加单词时进行重复检查和智能提示。

### 1.2 核心需求

| 需求 | 说明 |
|------|------|
| **重复检查** | 用户添加单词时，如果已添加过给出提示 |
| **内置释义显示** | 如果单词在数据库中，立即显示内置释义 |
| **释义分层** | 内置释义（只读）+ 用户释义（可编辑）|
| **避免冲突** | 添加内置单词书单词时，不重复创建记录 |

---

## 2. 数据模型设计

### 2.1 扩展 Word 类型

```typescript
// app/types/index.ts

export interface Word {
  id: string;
  word: string;
  phonetic?: string;
  phonetics: any[];
  
  // 内置释义（来自系统预置单词书，只读）
  builtInMeanings?: Meaning[];
  
  // 用户释义（可编辑）
  userMeanings?: Meaning[];
  
  // 向后兼容：meanings 等同于 userMeanings
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
  source: 'builtin' | 'user' | 'hybrid';
  
  // 如果是从系统单词创建的，记录原始单词ID
  originalWordId?: string;
}

// 添加单词检查结果类型
export interface WordCheckResult {
  userWord?: Word;      // 用户已添加的单词
  builtinWord?: Word;   // 系统预置单词
  existsInUserLibrary: boolean;
  existsInBuiltin: boolean;
}
```

### 2.2 数据库表变更

无需修改数据库表结构，使用现有 `words` 表的 `meanings` 字段存储用户释义，通过应用层逻辑区分内置和用户释义。

---

## 3. 功能规格

### 3.1 添加单词流程

```
用户输入单词
    ↓
点击"检查"或自动检查
    ↓
调用 checkWordExists(word, userId)
    ↓
├─ 如果用户已添加过 (existsInUserLibrary = true)
│   └─ 显示提示："该单词已在你的词库中"
│   └─ 提供选项：
│       ├─ [查看详情] - 跳转到单词详情页
│       ├─ [取消] - 清空输入
│       └─ [强制添加] - 继续添加（允许重复）
│
├─ 如果单词存在于系统单词书中 (existsInBuiltin = true)
│   └─ 显示内置释义卡片（只读）
│   └─ 提供选项：
│       ├─ [使用内置释义] - 创建引用，meanings = builtinMeanings
│       ├─ [添加我的释义] - 显示编辑表单，用户可修改
│       └─ [合并释义] - 内置释义 + 用户补充
│
└─ 如果单词不存在
    └─ 正常流程：从词典API获取释义
```

### 3.2 UI 组件设计

#### 3.2.1 重复提示组件

```
┌─────────────────────────────────────────┐
│  ⚠️ 该单词已在你的词库中                 │
│                                         │
│  单词: algorithm                        │
│  添加时间: 2024-01-15                   │
│  学习进度: 已掌握                       │
│                                         │
│  [查看详情]  [取消]  [强制添加]         │
└─────────────────────────────────────────┘
```

#### 3.2.2 内置释义显示组件

```
┌─────────────────────────────────────────┐
│  📖 发现系统内置释义                     │
│  ─────────────────────────────────────  │
│  algorithm /ˈælɡərɪðəm/                 │
│                                         │
│  【内置释义】                            │
│  n. 算法，计算程序                       │
│  n. 运算法则                             │
│                                         │
│  [✓ 使用内置释义]  [✎ 添加我的释义]     │
└─────────────────────────────────────────┘
```

#### 3.2.3 释义编辑组件

```
┌─────────────────────────────────────────┐
│  我的释义                                │
│  ─────────────────────────────────────  │
│  词性: [noun ▼]                         │
│  释义: [算法，计算程序            ]     │
│  例句: [This algorithm is efficient]    │
│  中文: [这个算法很高效            ]     │
│                                         │
│  [+ 添加释义]  [+ 添加词性]             │
└─────────────────────────────────────────┘
```

### 3.3 API 接口设计

#### 3.3.1 检查单词是否存在

```typescript
// GET /api/words/check?word=xxx&userId=xxx

interface CheckWordResponse {
  existsInUserLibrary: boolean;
  existsInBuiltin: boolean;
  userWord?: Word;
  builtinWord?: Word;
}
```

#### 3.3.2 添加单词（支持引用内置）

```typescript
// POST /api/words

interface AddWordRequest {
  word: string;
  userId: string;
  // 可选：使用内置释义
  useBuiltinMeanings?: boolean;
  builtinWordId?: string;
  // 可选：自定义释义
  meanings?: Meaning[];
  // 可选：强制添加（即使已存在）
  force?: boolean;
}
```

---

## 4. 技术实现方案

### 4.1 核心逻辑

#### 4.1.1 检查单词存在性

```typescript
// app/services/wordAPI.ts

export async function checkWordExists(
  word: string, 
  userId: string
): Promise<WordCheckResult> {
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
  
  return {
    userWord,
    builtinWord,
    existsInUserLibrary: !!userWord,
    existsInBuiltin: !!builtinWord,
  };
}
```

#### 4.1.2 添加单词（智能处理）

```typescript
export async function addWordWithCheck(
  wordData: AddWordRequest
): Promise<Word> {
  const { word, userId, useBuiltinMeanings, builtinWordId, meanings, force } = wordData;
  
  // 1. 检查是否已存在
  const checkResult = await checkWordExists(word, userId);
  
  // 2. 如果已存在且不强制添加，抛出错误
  if (checkResult.existsInUserLibrary && !force) {
    throw new Error('WORD_EXISTS');
  }
  
  // 3. 构建单词数据
  const wordRecord: Partial<Word> = {
    word: word.trim().toLowerCase(),
    user_id: userId,
    phonetic: '',
    phonetics: [],
    tags: [],
    interval: 0,
    ease_factor: 2.5,
    review_count: 0,
    next_review_at: Date.now(),
    created_at: Date.now(),
    updated_at: Date.now(),
    quality: 0,
  };
  
  // 4. 处理释义
  if (useBuiltinMeanings && checkResult.builtinWord) {
    // 使用内置释义
    wordRecord.builtInMeanings = checkResult.builtinWord.meanings;
    wordRecord.meanings = checkResult.builtinWord.meanings;
    wordRecord.source = 'hybrid';
    wordRecord.originalWordId = checkResult.builtinWord.id;
  } else if (meanings) {
    // 使用用户自定义释义
    wordRecord.meanings = meanings;
    wordRecord.source = 'user';
  } else {
    // 从词典API获取（原有逻辑）
    const dictData = await fetchWordFromDictionary(word);
    wordRecord.meanings = dictData.meanings;
    wordRecord.source = 'user';
  }
  
  // 5. 插入数据库
  const { data, error } = await supabase
    .from('words')
    .insert(wordRecord)
    .select()
    .single();
  
  if (error) throw error;
  
  // 6. 关联到自定义单词本
  await addToCustomWordBook(data.id, userId);
  
  return data;
}
```

### 4.2 组件架构

```
AddWord (主组件)
├── WordInput (单词输入 + 检查按钮)
├── DuplicateWarning (重复提示)
├── BuiltinMeaningsCard (内置释义卡片)
├── MeaningsEditor (释义编辑器)
└── ActionButtons (操作按钮)
```

---

## 5. 实现阶段

### Phase 1: 类型定义和 API
- 扩展 Word 类型
- 创建 checkWordExists API
- 修改 addWord API 支持智能添加

### Phase 2: UI 组件
- 创建 DuplicateWarning 组件
- 创建 BuiltinMeaningsCard 组件
- 修改 MeaningsEditor 组件

### Phase 3: 集成
- 修改 AddWord 主组件
- 集成检查逻辑
- 处理各种状态流转

### Phase 4: 测试
- 测试重复检查
- 测试内置释义显示
- 测试添加流程

---

## 6. 验收标准

- [ ] 输入已添加的单词，显示重复提示
- [ ] 输入系统单词书中的单词，显示内置释义
- [ ] 可以选择使用内置释义或自定义释义
- [ ] 添加内置单词书单词时，不重复创建记录
- [ ] 释义正确显示在单词详情页
- [ ] 向后兼容：旧数据正常显示
