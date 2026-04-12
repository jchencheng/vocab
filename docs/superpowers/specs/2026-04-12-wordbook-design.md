# 单词书功能设计文档

> 创建日期：2026-04-12
> 功能名称：单词书（WordBook）

---

## 1. 功能概述

### 1.1 目标
为用户提供单词书管理功能，支持：
- 系统预置单词书（经济学人高频单词）
- 用户自建单词书
- 多本单词书同时学习
- 学习模式切换（只学某书 / 混合学习）
- 重新学习功能

### 1.2 核心概念

| 概念 | 说明 |
|------|------|
| **单词书** | 单词的集合，可以是系统预置或用户自建 |
| **学习序列** | 用户可同时添加多本单词书到学习序列 |
| **当前学习单词书** | 用户当前主要学习的单词书 |
| **自定义单词本** | 用户手动添加的单词自动归入此默认单词书 |
| **学习模式** | 只学当前书 / 混合学习（优先当前书） |

---

## 2. 数据模型

### 2.1 数据库表结构

```sql
-- 单词书表
CREATE TABLE IF NOT EXISTS vocab_app.word_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES vocab_app.users(id) ON DELETE CASCADE, -- NULL 表示系统预置
    name TEXT NOT NULL,                    -- 单词书名称
    description TEXT,                      -- 描述
    word_count INTEGER DEFAULT 0,          -- 单词总数
    source_type TEXT DEFAULT 'custom',     -- 'system' | 'custom'
    category TEXT,                         -- 分类：四级/六级/雅思/托福等
    is_active BOOLEAN DEFAULT true,        -- 是否启用
    created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    updated_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- 单词书条目表（单词与单词书的关联）
CREATE TABLE IF NOT EXISTS vocab_app.word_book_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word_book_id UUID NOT NULL REFERENCES vocab_app.word_books(id) ON DELETE CASCADE,
    word_id UUID NOT NULL REFERENCES vocab_app.words(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'learning',        -- 'learning' | 'mastered' | 'ignored'
    added_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    mastered_at BIGINT,                    -- 掌握时间
    UNIQUE(word_book_id, word_id)
);

-- 用户学习序列表（用户可同时学习多本单词书）
CREATE TABLE IF NOT EXISTS vocab_app.user_learning_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES vocab_app.users(id) ON DELETE CASCADE,
    word_book_id UUID NOT NULL REFERENCES vocab_app.word_books(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,      -- 是否是主学单词书
    priority INTEGER DEFAULT 0,            -- 学习优先级（数字越小优先级越高）
    added_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    UNIQUE(user_id, word_book_id)
);
```

### 2.2 TypeScript 类型定义

```typescript
// 单词书
interface WordBook {
  id: string;
  userId: string | null;      // null 表示系统预置
  name: string;
  description?: string;
  wordCount: number;
  sourceType: 'system' | 'custom';
  category?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

// 单词书条目
interface WordBookItem {
  id: string;
  wordBookId: string;
  wordId: string;
  status: 'learning' | 'mastered' | 'ignored';
  addedAt: number;
  masteredAt?: number;
}

// 学习序列项
interface LearningSequenceItem {
  id: string;
  userId: string;
  wordBookId: string;
  isPrimary: boolean;
  priority: number;
  addedAt: number;
}

// 单词书统计
interface WordBookStats {
  total: number;
  learning: number;
  mastered: number;
  ignored: number;
  progress: number;
}

// 扩展 AppSettings
interface AppSettings {
  maxDailyReviews?: number;
  darkMode?: boolean;
  studyMode?: 'book-only' | 'book-priority' | 'mixed';  // 学习模式
  primaryWordBookId?: string | null;                     // 主学单词书ID
}

// 扩展 Word 类型
interface Word {
  id: string;
  word: string;
  phonetic?: string;
  phonetics: any[];
  meanings: any[];
  tags: string[];
  customNote?: string;
  interval: number;
  easeFactor: number;
  reviewCount: number;
  nextReviewAt: number;
  createdAt: number;
  updatedAt: number;
  quality: number;
  wordBookIds?: string[];     // 该单词所属的单词书ID列表
  inPrimaryBook?: boolean;    // 是否在主学单词书中
}
```

---

## 3. 功能规格

### 3.1 单词书管理

#### 3.1.1 浏览单词书
- 展示所有系统预置单词书
- 展示用户已添加的单词书
- 展示用户自建的单词书

#### 3.1.2 添加单词书到学习序列
- 从系统预置单词书中选择添加
- 添加到学习序列后可选择设为主学单词书
- 支持同时添加多本单词书

#### 3.1.3 创建自定义单词书
- 输入名称和描述
- 创建后可向其中添加单词

#### 3.1.4 从学习序列移除
- 可从学习序列中移除单词书
- 系统预置单词书移除后回到"未添加"状态
- 自定义单词书移除后删除（需确认）

#### 3.1.5 设置主学单词书
- 在学习序列中选择一本设为主学
- 主学单词书影响学习模式的单词抽取

### 3.2 学习模式

| 模式 | 说明 |
|------|------|
| **只学当前书** | 只从主学单词书中抽取单词复习 |
| **优先当前书** | 优先主学单词书，不足时从学习序列其他书补充 |
| **全部混合** | 从所有来源（包括不在任何单词书中的单词）统一抽取 |

### 3.3 重新学习功能

- **触发条件**：用户在单词书详情页点击"重新学习"按钮
- **确认流程**：弹出确认对话框，说明将重置整本书的学习进度
- **重置内容**：
  - 将该单词书所有条目的状态重置为 'learning'
  - 清空 mastered_at 时间
  - 重置后学习进度归零
- **不影响**：单词本身的复习数据（interval, easeFactor, reviewCount 等）

### 3.4 自定义单词本

- 系统自动创建一个名为"自定义单词本"的默认单词书
- 用户手动添加的单词自动归入此单词书
- 此单词书不可删除，但可以从学习序列中移除

---

## 4. UI 设计

### 4.1 导航栏更新

在现有导航栏新增"单词书"入口：

```
📚 Words | ➕ Add | 📖 单词书 | 🔄 Review | 🤖 AI Memory | ⚙️ Settings
```

### 4.2 单词书列表页面

```
┌─────────────────────────────────────────────────────────┐
│  我的学习序列                              [+ 添加单词书] │
├─────────────────────────────────────────────────────────┤
│  学习模式: [只学当前书 ▼]                                │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ 📘 经济学人  │  │ 📗 自定义   │  │ 📙 CET-4    │     │
│  │   高频单词   │  │   单词本    │  │             │     │
│  │ 进度: 35%   │  │ 进度: 62%   │  │ 进度: 12%   │     │
│  │ 学习中 120  │  │ 已掌握 50   │  │ 学习中 540  │     │
│  │ [主学中] ✓  │  │             │  │             │     │
│  │ [设为主学]  │  │ [设为主学]  │  │ [设为主学]  │     │
│  │ [查看详情]  │  │ [查看详情]  │  │ [查看详情]  │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
├─────────────────────────────────────────────────────────┤
│  可添加的系统单词书                                       │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐                       │
│  │ 📕 CET-6    │  │ 📓 IELTS    │  ...                │
│  │ 5500 词     │  │ 3000 词     │                       │
│  │ [添加到学习] │  │ [添加到学习] │                       │
│  └─────────────┘  └─────────────┘                       │
└─────────────────────────────────────────────────────────┘
```

### 4.3 单词书详情页面

```
┌─────────────────────────────────────────────────────────┐
│  ← 返回      经济学人高频单词              [⚙️ 设置]     │
│  系统预置 · 共 2500 词                                   │
├─────────────────────────────────────────────────────────┤
│  学习进度: 35%  ████████████░░░░░░░░░░░░░░░░░░░░░░░░    │
│  学习中 875 | 已掌握 875 | 未开始 750                    │
├─────────────────────────────────────────────────────────┤
│  [🔄 重新学习]  [📤 导出单词]  [➕ 添加单词]             │
├─────────────────────────────────────────────────────────┤
│  单词列表                    [搜索 🔍] [筛选 ▼]         │
├─────────────────────────────────────────────────────────┤
│  ☐ algorithm      n. 算法          [学习中]   [详情]   │
│  ☐ data structure n. 数据结构      [未开始]   [详情]   │
│  ☐ recursion      n. 递归          [已掌握] ✓ [详情]   │
│  ...                                                    │
└─────────────────────────────────────────────────────────┘
```

### 4.4 重新学习确认对话框

```
┌─────────────────────────────────────────┐
│  ⚠️ 确认重新学习                        │
├─────────────────────────────────────────┤
│                                         │
│  您确定要重新学习《经济学人高频单词》吗？  │
│                                         │
│  此操作将：                              │
│  • 重置整本书的学习进度为 0%             │
│  • 所有单词状态重置为"未开始"            │
│  • 此操作不可撤销                        │
│                                         │
│  单词本身的复习记录（如复习次数）将保留。   │
│                                         │
│     [取消]        [确认重新学习]         │
│                                         │
└─────────────────────────────────────────┘
```

---

## 5. API 接口设计

### 5.1 单词书管理接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/wordbooks` | GET | 获取所有单词书（系统 + 用户学习序列） |
| `/api/wordbooks` | POST | 创建自定义单词书 |
| `/api/wordbooks/[id]` | GET | 获取单词书详情 |
| `/api/wordbooks/[id]` | DELETE | 删除自定义单词书 |
| `/api/wordbooks/[id]/words` | GET | 获取单词书内单词列表 |
| `/api/wordbooks/[id]/reset` | POST | 重新学习（重置进度） |

### 5.2 学习序列接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/learning-sequence` | GET | 获取当前学习序列 |
| `/api/learning-sequence` | POST | 添加单词书到学习序列 |
| `/api/learning-sequence/[id]` | DELETE | 从学习序列移除 |
| `/api/learning-sequence/primary` | PUT | 设置主学单词书 |

### 5.3 设置接口更新

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/settings` | GET | 获取设置（新增 studyMode, primaryWordBookId） |
| `/api/settings` | PUT | 更新设置（新增 studyMode, primaryWordBookId） |

---

## 6. 内置单词书：经济学人高频单词

### 6.1 数据来源
- 文件：`te_vocab_filtered_v6.xlsx`
- 处理方式：脚本解析导入

### 6.2 单词书信息
- **名称**：经济学人高频单词
- **描述**：精选经济学人文章中的高频词汇
- **分类**：System / Reading
- **来源类型**：system

### 6.3 导入流程
1. 读取 Excel 文件
2. 解析单词列表
3. 创建系统单词书（user_id = null）
4. 对于每个单词：
   - 如果单词已存在于用户词库，创建关联
   - 如果单词不存在，可选择预创建（不强制）

---

## 7. 敏感数据处理

### 7.1 文件保护
以下文件不得提交到 GitHub 或部署到 Vercel：
- `stardict.db` - 词典数据库
- `te_vocab_filtered_v6.xlsx` - 单词数据源

### 7.2 .gitignore 更新
```
# 敏感数据文件
*.db
*.sqlite
*.xlsx
/data/
/dictionaries/
```

---

## 8. 实现阶段

| 阶段 | 内容 |
|------|------|
| Phase 1 | 数据库表创建、类型定义、API 基础接口 |
| Phase 2 | 单词书管理 UI（列表、添加、删除） |
| Phase 3 | 学习序列管理、学习模式切换 |
| Phase 4 | 复习算法调整、支持单词书模式 |
| Phase 5 | 内置单词书导入脚本 |
| Phase 6 | 重新学习功能 |
| Phase 7 | 测试、优化、Bug 修复 |

---

## 9. 验收标准

- [ ] 用户可以查看系统预置单词书
- [ ] 用户可以将系统单词书添加到学习序列
- [ ] 用户可以创建自定义单词书
- [ ] 用户可以设置主学单词书
- [ ] 用户可以切换学习模式（只学当前书 / 优先当前书 / 全部混合）
- [ ] 复习功能根据学习模式正确抽取单词
- [ ] 用户可以查看单词书详情和学习进度
- [ ] 用户可以重新学习单词书（重置进度）
- [ ] 用户手动添加的单词自动归入"自定义单词本"
- [ ] 敏感数据文件（.db, .xlsx）不被提交到版本控制

---

## 10. 附录

### 10.1 现有数据结构参考

参见：`app/types/index.ts`, `supabase_schema.sql`

### 10.2 相关文件

- `te_vocab_filtered_v6.xlsx` - TE Vocab 单词数据源
- `stardict.db` - 词典数据库（仅本地使用）
