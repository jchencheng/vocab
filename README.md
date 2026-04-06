# VocabMaster - 个人词汇学习应用

一个功能强大的个人词汇学习应用，帮助用户高效管理和复习英语词汇。

## 功能特性

- **单词添加**：搜索单词并获取释义，支持手动添加和编辑单词
- **单词管理**：查看、编辑和删除单词
- **智能复习**：基于记忆曲线算法的智能复习系统
- **复习设置**：可设置每天最多复习的单词数量
- **AI 记忆助手**：使用 LLM 帮助记忆单词
- **多 API 支持**：可配置和切换多个 AI API 提供商
- **数据导出/导入**：支持 JSON 格式的数据导出和导入
- **深色模式**：支持浅色和深色主题

## 技术栈

- **前端框架**：React 18 + TypeScript
- **构建工具**：Vite
- **样式**：Tailwind CSS
- **数据存储**：IndexedDB
- **AI 集成**：支持 OpenAI、Google Gemini、Anthropic Claude 等

## 安装和运行

### 前提条件

- Node.js 18+ 已安装
- npm 或 yarn 包管理器

### 安装步骤

1. 克隆仓库

```bash
git clone https://github.com/jchencheng/vocab.git
cd vocab
```

2. 安装依赖

```bash
npm install
# 或
yarn install
```

3. 运行开发服务器

```bash
npm run dev
# 或
yarn dev
```

4. 构建生产版本

```bash
npm run build
# 或
yarn build
```

## 项目结构

```
├── src/
│   ├── components/         # 组件目录
│   │   ├── AddWord.tsx     # 添加单词组件
│   │   ├── WordList.tsx    # 单词列表组件
│   │   ├── Review.tsx      # 复习组件
│   │   ├── AIMemory.tsx    # AI 记忆助手组件
│   │   ├── Settings.tsx    # 设置组件
│   │   └── Navbar.tsx      # 导航栏组件
│   ├── context/            # 上下文管理
│   │   └── AppContext.tsx  # 应用上下文
│   ├── lib/                # 工具库
│   │   ├── dictionaryAPI.ts     # 词典 API 调用
│   │   ├── indexedDB.ts         # IndexedDB 操作
│   │   └── spacedRepetition.ts  # 记忆曲线算法
│   ├── App.tsx             # 应用主组件
│   └── main.tsx            # 应用入口
├── public/                 # 静态资源
├── index.html              # HTML 模板
├── package.json            # 项目配置
└── vite.config.ts          # Vite 配置
```

## 使用方法

### 添加单词
1. 在 "Add" 标签页中输入单词
2. 点击 "Search" 按钮获取单词释义
3. 编辑单词信息（可选）
4. 点击 "Add to Vocabulary" 按钮保存单词

### 复习单词
1. 在 "Review" 标签页中开始复习
2. 根据提示回答问题
3. 点击相应的数字按钮评估记忆效果（0-5）
4. 系统会根据评估结果调整下次复习时间

### 管理 API 设置
1. 在 "Settings" 标签页中配置 API
2. 可添加多个 API 配置
3. 选择当前使用的 API
4. 点击 "Save Settings" 保存配置

## 贡献指南

欢迎贡献代码和提出建议！请按照以下步骤：

1. Fork 仓库
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT 许可证

## 联系信息

- 项目地址：https://github.com/jchencheng/vocab
- 作者：jchencheng