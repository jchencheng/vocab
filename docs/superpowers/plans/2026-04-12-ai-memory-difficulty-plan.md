# AI Memory Assistant 智能抽选实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。

**目标：** 基于复习进度（quality/easeFactor/interval/reviewCount）实现智能抽选记忆困难单词功能

**架构：** 在 spacedRepetition.ts 中添加记忆难度评分算法，在 AIMemory 组件中添加抽选模式切换（困难优先/混合/手动），根据用户选择自动抽选合适的单词生成故事

**技术栈：** TypeScript, React, Next.js

---

## 文件清单

| 文件 | 职责 |
|------|------|
| `app/utils/spacedRepetition.ts` | 添加记忆难度评分算法和抽选策略函数 |
| `app/components/AIMemory.tsx` | 添加抽选模式UI、自动抽选逻辑、显示推荐单词 |
| `app/types/index.ts` | 添加抽选模式类型定义 |

---

## 任务 1：添加记忆难度评分算法

**文件：**
- 修改：`app/utils/spacedRepetition.ts`

- [ ] **步骤 1：添加 calculateMemoryDifficulty 函数**

```typescript
/**
 * 计算单词的记忆难度评分 (0-100，分数越高越困难)
 * 基于 quality, easeFactor, interval, reviewCount 综合评估
 */
export function calculateMemoryDifficulty(word: Word): number {
  let difficulty = 0;
  
  // 1. 质量评分影响 (quality: 0-5，越低越困难)
  if (word.quality <= 2) {
    difficulty += 40;
  } else if (word.quality === 3) {
    difficulty += 20;
  }
  
  // 2. 易度因子影响 (easeFactor: 默认 2.5，越低越困难)
  if (word.easeFactor < 2.0) {
    difficulty += 25;
  } else if (word.easeFactor < 2.3) {
    difficulty += 15;
  }
  
  // 3. 复习次数影响 (复习次数多但 interval 短 = 记不住)
  if (word.reviewCount >= 3 && word.interval < 7) {
    difficulty += 20;
  }
  
  // 4. 间隔天数影响 (长期没复习的单词)
  const daysSinceReview = Math.floor((Date.now() - word.nextReviewAt) / (24 * 60 * 60 * 1000));
  if (daysSinceReview > 0) {
    difficulty += Math.min(daysSinceReview * 2, 15);
  }
  
  return Math.min(difficulty, 100);
}
```

- [ ] **步骤 2：添加 selectDifficultWords 函数**

```typescript
/**
 * 按记忆难度排序，优先选择最困难的单词
 * @param words 单词列表
 * @param count 选择数量
 * @param minDifficulty 最小难度阈值 (默认30)
 */
export function selectDifficultWords(
  words: Word[], 
  count: number = 10, 
  minDifficulty: number = 30
): Word[] {
  return words
    .map(w => ({ word: w, difficulty: calculateMemoryDifficulty(w) }))
    .filter(w => w.difficulty >= minDifficulty)
    .sort((a, b) => b.difficulty - a.difficulty)
    .slice(0, count)
    .map(w => w.word);
}
```

- [ ] **步骤 3：添加 selectMixedWords 函数**

```typescript
/**
 * 混合模式：70% 困难单词 + 30% 随机单词
 * @param words 单词列表
 * @param count 选择数量
 */
export function selectMixedWords(words: Word[], count: number = 10): Word[] {
  const difficultCount = Math.floor(count * 0.7);
  const randomCount = count - difficultCount;
  
  // 获取困难单词（多选一些用于备选）
  const difficultWords = selectDifficultWords(words, difficultCount * 2, 20);
  
  // 获取随机单词（排除已选的困难单词）
  const difficultIds = new Set(difficultWords.map(w => w.id));
  const remainingWords = words.filter(w => !difficultIds.has(w.id));
  const randomWords = shuffleWords(remainingWords).slice(0, randomCount);
  
  // 合并后再次随机排序
  return shuffleWords([
    ...difficultWords.slice(0, difficultCount), 
    ...randomWords
  ]);
}
```

- [ ] **步骤 4：Commit**

```bash
git add app/utils/spacedRepetition.ts
git commit -m "feat(记忆算法): 添加记忆难度评分和智能抽选函数

- calculateMemoryDifficulty: 基于 quality/easeFactor/interval/reviewCount 计算难度
- selectDifficultWords: 选择最困难的单词
- selectMixedWords: 混合模式抽选（70%困难+30%随机）"
```

---

## 任务 2：添加抽选模式类型定义

**文件：**
- 修改：`app/types/index.ts`

- [ ] **步骤 1：添加 SelectionMode 类型**

在文件中找到 `StudyMode` 类型定义附近，添加：

```typescript
// AI Memory Assistant 抽选模式
export type SelectionMode = 'difficult' | 'mixed' | 'manual';
```

- [ ] **步骤 2：Commit**

```bash
git add app/types/index.ts
git commit -m "feat(types): 添加 SelectionMode 类型定义"
```

---

## 任务 3：修改 AIMemory 组件

**文件：**
- 修改：`app/components/AIMemory.tsx`

- [ ] **步骤 1：导入新函数和类型**

```typescript
import { 
  calculateMemoryDifficulty, 
  selectDifficultWords, 
  selectMixedWords 
} from '../utils/spacedRepetition';
import type { Word, AIContext, SelectionMode } from '../types';
```

- [ ] **步骤 2：添加状态变量**

在组件状态中添加：

```typescript
const [selectionMode, setSelectionMode] = useState<SelectionMode>('difficult');
const [recommendedWords, setRecommendedWords] = useState<Word[]>([]);
const [showWordDetails, setShowWordDetails] = useState(false);
```

- [ ] **步骤 3：添加自动抽选逻辑**

```typescript
// 根据抽选模式自动选择单词
const autoSelectWords = useCallback(() => {
  if (words.length === 0) return;
  
  let selected: Word[] = [];
  
  switch (selectionMode) {
    case 'difficult':
      selected = selectDifficultWords(words, 10);
      break;
    case 'mixed':
      selected = selectMixedWords(words, 10);
      break;
    case 'manual':
      // 手动模式：保留当前选择
      return;
  }
  
  // 更新选中的单词集合
  setSelectedWords(new Set(selected.map(w => w.id)));
  setRecommendedWords(selected);
}, [words, selectionMode]);

// 当模式改变或单词变化时自动抽选
useEffect(() => {
  if (selectionMode !== 'manual') {
    autoSelectWords();
  }
}, [selectionMode, words, autoSelectWords]);
```

- [ ] **步骤 4：添加抽选模式UI**

替换原有的单词选择区域，添加模式选择器：

```tsx
{activeTab === 'generate' && (
  <div className="space-y-6">
    {/* 抽选模式选择 */}
    <div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
        <span>🎯</span>
        抽选模式
      </h3>
      <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-700/50 rounded-xl">
        {[
          { key: 'difficult', label: '记忆困难优先', icon: '🔥' },
          { key: 'mixed', label: '混合模式', icon: '🎲' },
          { key: 'manual', label: '手动选择', icon: '✋' },
        ].map((mode) => (
          <button
            key={mode.key}
            onClick={() => setSelectionMode(mode.key as SelectionMode)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              selectionMode === mode.key
                ? 'bg-white dark:bg-slate-600 shadow-sm text-primary-600 dark:text-primary-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span className="mr-1">{mode.icon}</span>
            {mode.label}
          </button>
        ))}
      </div>
    </div>

    {/* 选中的单词显示 */}
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span>📝</span>
          {selectionMode === 'manual' ? '选择单词' : '推荐单词'}
          <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
            ({selectedWords.size} 个)
          </span>
        </h3>
        {selectionMode !== 'manual' && (
          <button
            onClick={autoSelectWords}
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            <span>🔄</span> 重新抽选
          </button>
        )}
      </div>

      {/* 显示推荐单词详情 */}
      {recommendedWords.length > 0 && selectionMode !== 'manual' && (
        <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
              💡 这些单词最近复习质量较低，建议重点记忆
            </span>
            <button
              onClick={() => setShowWordDetails(!showWordDetails)}
              className="text-xs text-amber-600 hover:text-amber-700"
            >
              {showWordDetails ? '隐藏详情' : '查看详情'}
            </button>
          </div>
          {showWordDetails && (
            <div className="space-y-1 text-xs text-amber-700 dark:text-amber-300">
              {recommendedWords.slice(0, 5).map(word => {
                const difficulty = calculateMemoryDifficulty(word);
                return (
                  <div key={word.id} className="flex items-center gap-2">
                    <span className="font-medium">{word.word}</span>
                    <span className="text-amber-600">难度: {difficulty}%</span>
                    <span className="text-slate-400">
                      (Q:{word.quality} E:{word.easeFactor.toFixed(1)})
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 单词标签 */}
      {words.length === 0 ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-600/50">
          <div className="text-4xl mb-4">📖</div>
          <p className="text-lg font-medium mb-2">No words available</p>
          <p>Add some words first to create stories!</p>
        </div>
      ) : (
        <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-600/50">
          <div className="flex flex-wrap gap-2.5 max-h-48 overflow-y-auto">
            {words.map(word => {
              const isSelected = selectedWords.has(word.id);
              const difficulty = selectionMode !== 'manual' ? calculateMemoryDifficulty(word) : 0;
              
              return (
                <button
                  key={word.id}
                  onClick={() => selectionMode === 'manual' && toggleWordSelection(word.id)}
                  disabled={selectionMode !== 'manual'}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all relative ${
                    isSelected
                      ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-soft'
                      : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-600'
                  } ${selectionMode !== 'manual' ? 'cursor-default' : 'cursor-pointer hover:shadow-soft'}`}
                >
                  {word.word}
                  {isSelected && difficulty > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center">
                      {difficulty >= 70 ? '!' : ''}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>

    {/* 生成按钮 */}
    <button
      onClick={handleGenerate}
      disabled={selectedWords.size === 0 || isGenerating}
      className="w-full py-4 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-2xl font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-soft hover:shadow-medium active:scale-[0.98]"
    >
      {isGenerating ? (
        <span className="flex items-center justify-center gap-2">
          <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
          Generating...
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          <span>✨</span>
          Generate Story ({selectedWords.size} words)
        </span>
      )}
    </button>
  </div>
)}
```

- [ ] **步骤 5：Commit**

```bash
git add app/components/AIMemory.tsx
git commit -m "feat(AI Memory): 实现智能抽选记忆困难单词功能

- 添加抽选模式切换（困难优先/混合/手动）
- 自动根据复习数据抽选单词
- 显示推荐单词难度详情
- 支持重新抽选"
```

---

## 任务 4：验证构建

**文件：**
- 所有修改的文件

- [ ] **步骤 1：运行 TypeScript 检查**

```bash
npm run build
```

预期：构建成功，无类型错误

- [ ] **步骤 2：Commit（如有必要）**

---

## 自检清单

- [ ] `calculateMemoryDifficulty` 函数正确计算难度评分
- [ ] `selectDifficultWords` 和 `selectMixedWords` 函数正确抽选单词
- [ ] `SelectionMode` 类型已定义
- [ ] AIMemory 组件正确显示抽选模式UI
- [ ] 自动抽选逻辑在模式改变时触发
- [ ] 手动模式下用户可以点击选择单词
- [ ] 构建通过，无类型错误
