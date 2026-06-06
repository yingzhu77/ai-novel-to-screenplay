import OpenAI from "openai";
import { ChapterScreenplaySchema, type Character, type ChapterScreenplay } from "./schema";

export interface LLMConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface ConvertResult {
  success: boolean;
  data?: ChapterScreenplay;
  error?: string;
}

const SYSTEM_PROMPT = `你是一位专业的剧本改编师。你的任务是将小说章节转换为结构化的剧本格式（YAML Schema）。

## 输出要求

你必须输出一个严格的 JSON 对象，只包含当前章节的剧本数据（不要包含 meta 或 characters 顶层字段）。格式如下：

\`\`\`typescript
{
  chapter_number: number;          // 章节序号
  chapter_title: string;           // 章节标题
  scene_count: number;             // 场景数量
  scenes: [{
    scene_id: string;              // 格式: CH{章节号}_SC{场景序号}，如 CH1_SC1
    scene_heading: string;         // 标准场景头：INT./EXT. 地点 - 时间
    location: string;              // 场景地点
    time: string;                  // 时间描述
    characters_present: string[];  // 本场出场角色名称列表
    action: string;                // 场景动作描写/舞台指示
    dialogues: [{
      index: number;               // 对话序号，从1开始
      speaker: string;             // 说话角色名称
      to?: string;                 // 对话对象（可选）
      text: string;                // 台词原文
      emotion?: string;            // 情绪标注（可选）
      action?: string;             // 伴随动作（可选）
      subtext?: string;            // 潜台词（可选）
    }];
    notes?: string;                // 导演/编剧备注（可选）
  }];
}
\`\`\`

## 转换规则

1. **场景分割**：根据地点、时间、事件变化自动识别场景切换点
2. **场景头格式**：使用 INT./EXT. 地点 - 时间 的标准格式
3. **对话提取**：准确提取角色对白，保留原文
4. **动作描写**：将叙述性文字转换为舞台指示格式
5. **情绪标注**：根据上下文推断角色情绪
6. **潜台词**：当角色话语有言外之意时标注
7. **角色名称**：保持一致，使用小说中的原名

## 输出格式

只输出 JSON，不要包含任何其他文字、解释或 markdown 代码块标记。`;

function buildUserPrompt(
  chapter: { number: number; title: string; content: string },
  existingCharacters?: Character[]
): string {
  let prompt = `请将以下小说章节转换为剧本格式：

## 章节信息
- 章节号：${chapter.number}
- 章节标题：${chapter.title}

## 章节内容
${chapter.content}`;

  if (existingCharacters && existingCharacters.length > 0) {
    prompt += `

## 已知角色（跨章节一致性参考）
${existingCharacters
  .map(
    (c) =>
      `- ${c.name}（${c.role}）：${c.description}。特征：${c.traits.join("、")}。别名：${c.aliases.join("、") || "无"}`
  )
  .join("\n")}

请确保本章节中的角色与上述已知角色保持一致。如果有新角色出现，请在输出中包含他们。`;
  }

  return prompt;
}

export async function convertChapterToScreenplay(
  chapter: { number: number; title: string; content: string },
  config: LLMConfig,
  existingCharacters?: Character[]
): Promise<ConvertResult> {
  try {
    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });

    const userPrompt = buildUserPrompt(chapter, existingCharacters);

    const response = await client.chat.completions.create({
      model: config.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 8192,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { success: false, error: "LLM returned empty response" };
    }

    // Parse JSON response
    let parsed: unknown;
    try {
      // Strip markdown code block if present
      const cleaned = content
        .replace(/^```(?:json)?\s*\n?/m, "")
        .replace(/\n?```\s*$/m, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return { success: false, error: `Invalid JSON response from LLM: ${content.slice(0, 200)}` };
    }

    // Validate against schema
    const result = ChapterScreenplaySchema.safeParse(parsed);
    if (!result.success) {
      return {
        success: false,
        error: `Schema validation failed: ${result.error.message}`,
      };
    }

    return { success: true, data: result.data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `LLM API error: ${message}` };
  }
}
