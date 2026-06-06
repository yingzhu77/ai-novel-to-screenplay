# AI Novel to Screenplay

> 将小说文本自动转换为结构化剧本（YAML 格式）

[English](#english) | **中文**

## 在线演示

🔗 **[点击体验](https://aiscreenplay.yingzhu.xyz)**

## 功能特点

- **智能章节识别** — 支持中文（第X章/节/回）、英文（Chapter X）、Markdown 标题格式
- **多格式输入** — 支持 .txt、.md、.docx 文件上传，可多文件同时处理
- **AI 剧本转换** — DeepSeek V4 Flash 模型，自动识别场景、对话、情绪、角色
- **实时进度** — SSE 流式传输，逐章显示转换进度
- **角色关系图** — 可视化角色之间的关系网络
- **原文对比** — 并排查看小说原文与转换后的剧本
- **结构化输出** — 自定义 YAML Schema，支持 YAML/JSON 双格式下载
- **云端存储** — 自动保存到对象存储，24 小时内可重复下载
- **深色模式** — 支持亮色/暗色主题切换
- **响应式设计** — 适配桌面端和移动端

## 技术架构

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│      Next.js 16 + React 19 + Tailwind CSS       │
│         粘贴小说 / 上传文件 / 拖拽上传            │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│                 API Routes (SSE)                 │
│  /api/parse       — 章节拆分                     │
│  /api/convert-stream — 流式 LLM 转换             │
│  /api/storage     — 云端存储                      │
└───────┬──────────────┬──────────────────────────┘
        │              │
┌───────▼──────┐ ┌─────▼────────────┐
│ DeepSeek V4  │ │   对象存储        │
│   Flash      │ │  (S3 协议)       │
└──────────────┘ └──────────────────┘
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 16 (App Router) + React 19 + TypeScript |
| UI | Tailwind CSS 4 + shadcn/ui |
| LLM | DeepSeek V4 Flash（OpenAI 兼容 API） |
| 存储 | S3 兼容协议（签名 URL 下载） |
| Schema | Zod 验证 + 自定义 YAML Schema |
| 流式传输 | Server-Sent Events (POST + ReadableStream) |
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
# LLM 服务（OpenAI 兼容 API）
DEEPSEEK_API_KEY=your-api-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash

# 对象存储（S3 兼容）
QINIU_ACCESS_KEY=your-access-key
QINIU_SECRET_KEY=your-secret-key
QINIU_BUCKET=your-bucket-name
QINIU_ENDPOINT=https://s3-cn-north-1.qiniucs.com
QINIU_REGION=cn-north-1
```

### 部署到 Vercel

```bash
npm i -g vercel
vercel
```

## YAML Schema 设计

### 核心结构

```yaml
meta:
  screenplay_title: 剧本标题
  adaptation_of: 改编自哪部小说
  chapters_included: [1, 2, 3]

characters:
  - id: CHAR_1
    name: 角色名
    role: 主角/配角
    description: 外貌与身份简介
    traits: [性格特征]

chapters:
  - chapter_number: 1
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
│   ├── page.tsx                  # 首页（完整交互流程）
│   ├── layout.tsx                # 根布局
│   └── api/
│       ├── convert/route.ts      # 单章转换 API
│       ├── convert-stream/route.ts # SSE 流式转换
│       ├── parse/route.ts        # 章节解析 API
│       └── storage/route.ts      # 云端存储 API
├── lib/
│   ├── schema.ts                 # Zod Schema 定义
│   ├── splitter.ts               # 章节拆分器
│   ├── llm.ts                    # LLM API 封装
│   └── qiniu.ts                  # 对象存储封装
├── types/
│   └── screenplay.ts             # TypeScript 类型
├── docs/
│   └── yaml-schema-design.md     # Schema 设计文档
└── components/ui/                # shadcn/ui 组件
```

## 测试

```bash
npm test
```

17 个测试用例覆盖章节拆分和 LLM 调用。

## License

MIT

---

# English

## AI Novel to Screenplay

> Automatically convert novel text into structured screenplays (YAML format)

### Live Demo

🔗 **[Try it now](https://aiscreenplay.yingzhu.xyz)**

### Features

- **Smart chapter detection** — Chinese (第X章/节/回), English (Chapter X), Markdown headers
- **Multi-format input** — .txt, .md, .docx file upload with multi-file support
- **AI conversion** — DeepSeek V4 Flash, auto-detects scenes, dialogues, emotions, characters
- **Real-time progress** — SSE streaming shows per-chapter conversion status
- **Character relationship graph** — Visual relationship network
- **Comparison view** — Side-by-side novel text vs screenplay
- **Structured output** — YAML/JSON download with custom Schema
- **Cloud storage** — Auto-save with 24h signed download URLs
- **Dark mode** — Light/dark theme toggle
- **Responsive** — Desktop and mobile optimized

### Tech Stack

- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui
- **LLM**: DeepSeek V4 Flash (OpenAI-compatible API)
- **Storage**: S3-compatible object storage (signed URL)
- **Schema**: Zod validation + custom YAML Schema
- **Streaming**: Server-Sent Events (POST + ReadableStream)

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

1. Paste novel text or upload .txt/.md/.docx files
2. AI detects and splits chapters automatically
3. Each chapter is converted to a structured screenplay scene (SSE streaming)
4. Preview the result, view character relationships, compare with original
5. Download as YAML or JSON, or save to cloud storage

### License

MIT
