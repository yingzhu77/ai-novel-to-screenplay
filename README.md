# AI Novel to Screenplay

> 将小说文本自动转换为结构化剧本（YAML 格式）— 七牛云 × XEngineer 暑期实训营参赛作品

[English](#english) | **中文**

## 在线演示

🔗 **[点击体验](https://aiscreenplay.yingzhu.xyz)**

## 功能特点

- **智能章节识别** — 支持中文（第X章/节/回）和英文（Chapter X）格式
- **AI 剧本转换** — DeepSeek V4 Flash 模型，自动识别场景、对话、情绪
- **结构化输出** — 符合自定义 YAML Schema，支持 YAML/JSON 双格式下载
- **存算分离架构** — 七牛云 Kodo S3 存储 + DeepSeek LLM 计算
- **免费使用** — 七牛 AI Token API 提供 300 万免费 Token

## 技术架构

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│            Next.js + Tailwind CSS               │
│         粘贴小说 / 上传 .txt 文件                 │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│                 API Routes                       │
│  /api/parse    — 章节拆分                        │
│  /api/convert  — LLM 转换（七牛 AI Token API）    │
│  /api/storage  — 文件存储（七牛 Kodo S3）         │
└───────┬──────────────┬──────────────────────────┘
        │              │
┌───────▼──────┐ ┌─────▼────────────┐
│ DeepSeek V4  │ │   Qiniu Kodo     │
│   Flash      │ │   S3 Storage     │
│ (via 七牛)   │ │ (签名 URL 下载)   │
└──────────────┘ └──────────────────┘
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 16 (App Router) + React 19 + TypeScript |
| UI | Tailwind CSS 4 + shadcn/ui |
| LLM | DeepSeek V4 Flash（七牛 AI Token API） |
| 存储 | 七牛云 Kodo（S3 兼容协议） |
| Schema | Zod 验证 + 自定义 YAML Schema |
| 测试 | Vitest（17 个测试用例） |

## 快速开始

### 环境要求

- Node.js 20.9+
- npm / yarn / pnpm

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/yingzhu77/ai-novel-to-screenplay.git
cd ai-novel-to-screenplay

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入你的 API Key

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000

### 环境变量

```env
# 七牛 AI Token API（LLM 服务）
DEEPSEEK_API_KEY=your-qiniu-ai-api-key
DEEPSEEK_BASE_URL=https://openai.qiniu.com/v1
DEEPSEEK_MODEL=deepseek/deepseek-v4-flash

# 七牛云 Kodo S3（文件存储）
QINIU_ACCESS_KEY=your-access-key
QINIU_SECRET_KEY=your-secret-key
QINIU_BUCKET=your-bucket-name
QINIU_ENDPOINT=https://s3-cn-north-1.qiniucs.com
QINIU_REGION=cn-north-1
```

### 部署到 Vercel

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel

# 配置环境变量（在 Vercel 控制台或通过 CLI）
vercel env add DEEPSEEK_API_KEY
# ... 其他环境变量
```

## YAML Schema 设计

### 设计哲学

Schema 采用三层融合设计：
1. **方案 A — 专业剧本元数据**（meta 层）
2. **方案 B — AI 可控边界**（scene/dialogue 结构）
3. **方案 C — 实体建模**（角色独立实体）

### 核心结构

```yaml
meta:
  screenplay_title: 剧本标题
  adaptation_of: 改编自哪部小说
  author: 改编者
  chapters_included: [1, 2, 3]

characters:
  - id: CHAR_1
    name: 角色名
    aliases: [别名]
    role: 主角/反派/配角
    description: 外貌与身份简介
    traits: [性格特征]

chapters:
  - chapter_number: 1
    chapter_title: 第一章 标题
    scenes:
      - scene_id: CH1_SC1
        scene_heading: INT. 地点 - 时间
        dialogues:
          - index: 1
            speaker: 说话角色
            text: 台词内容
            emotion: 情绪标注
```

详细设计文档见 [docs/yaml-schema-design.md](docs/yaml-schema-design.md)

## 项目结构

```
├── app/
│   ├── page.tsx              # 首页
│   ├── layout.tsx            # 根布局
│   └── api/
│       ├── convert/route.ts  # LLM 转换 API
│       ├── parse/route.ts    # 章节解析 API
│       └── storage/route.ts  # 文件存储 API
├── lib/
│   ├── schema.ts             # Zod Schema 定义
│   ├── splitter.ts           # 章节拆分器
│   ├── llm.ts                # DeepSeek API 封装
│   └── qiniu.ts              # 七牛 S3 封装
├── types/
│   └── screenplay.ts         # TypeScript 类型
├── docs/
│   └── yaml-schema-design.md # Schema 设计文档
└── components/ui/            # shadcn/ui 组件
```

## 测试

```bash
# 运行所有测试
npm test

# 查看测试覆盖率
npx vitest run --coverage
```

当前 17 个测试用例，覆盖章节拆分和 LLM 调用。

## 评审标准对齐

| 评审维度 | 我们的方案 |
|----------|-----------|
| **功能完整性** | 粘贴/上传 → 拆分 → LLM 转换 → 预览 → 下载 YAML/JSON |
| **易用性** | 三步完成，零学习成本，ilovepdf 极简风格 |
| **创新性** | 自定义 YAML Schema、存算分离、角色关系提取 |
| **技术难度** | 七牛 AI Token API + Kodo S3 双重集成 |

## License

MIT

---

# English

## AI Novel to Screenplay

> Automatically convert novel text into structured screenplays (YAML format)

### Live Demo

🔗 **[Try it now](https://aiscreenplay.yingzhu.xyz)**

### Features

- **Smart chapter detection** — Supports Chinese (第X章/节/回) and English (Chapter X) formats
- **AI screenplay conversion** — DeepSeek V4 Flash model, auto-detects scenes, dialogues, and emotions
- **Structured output** — Custom YAML Schema, supports YAML/JSON download
- **Cloud-native architecture** — Qiniu Kodo S3 storage + DeepSeek LLM via Qiniu AI Token API

### Tech Stack

- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui
- **LLM**: DeepSeek V4 Flash (via Qiniu AI Token API, 3M free tokens)
- **Storage**: Qiniu Kodo (S3-compatible protocol, signed URL download)
- **Schema**: Zod validation + custom YAML Schema

### Quick Start

```bash
git clone https://github.com/yingzhu77/ai-novel-to-screenplay.git
cd ai-novel-to-screenplay
npm install
cp .env.example .env.local
# Edit .env.local with your API keys
npm run dev
```

### How It Works

1. Paste novel text or upload a .txt file
2. AI detects and splits chapters automatically
3. Each chapter is converted to a structured screenplay scene
4. Preview the result and download as YAML or JSON

### Architecture

```
User → Next.js Frontend → API Routes → DeepSeek V4 Flash (via Qiniu AI)
                                    → Qiniu Kodo S3 (file storage)
```

### License

MIT
