import OpenAI from "openai";
import { ChapterScreenplaySchema, CharacterSchema, type Character, type ChapterScreenplay } from "./schema";

export interface LLMConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface ConvertResult {
  success: boolean;
  data?: ChapterScreenplay;
  characters?: Character[];
  error?: string;
}

const SYSTEM_PROMPT = `你是一位专业的剧本改编师。将小说章节转换为 JSON 格式的剧本。

## 必须严格遵守的 JSON 结构（字段名不可改动）

{"chapter_number":1,"chapter_title":"第一章 标题","scene_count":1,"characters":[{"id":"CHAR_1","name":"角色名","aliases":[],"role":"主角/配角","description":"简介","traits":["特征"]}],"scenes":[{"scene_id":"CH1_SC1","scene_heading":"INT. 地点 - 时间","location":"地点名","time":"时间描述","characters_present":["角色A"],"action":"舞台指示/动作描写文字","dialogues":[{"index":1,"speaker":"说话人","text":"台词内容"}]}]}

## 字段说明

characters 数组：
- id: 唯一标识，格式 CHAR_N（N 从 1 递增）
- name: 角色姓名
- aliases: 别名列表，无则为空数组
- role: "主角"、"反派"、"配角" 之一
- description: 外貌与身份简介
- traits: 性格特征数组

scenes 数组：
- scene_id: 格式必须是 CH{章节号}_SC{场景序号}，如 CH1_SC1
- scene_heading: 必须以 INT. 或 EXT. 开头，后接地点和时间
- action: 叙述性文字转成的舞台指示，是 string 不是 array
- dialogues: 对话数组，每项必须有 index、speaker、text
- 如果无对话，dialogues 为空数组 []
- 可选字段（有则加，无则省略）：to、emotion、action(dialogue内)、subtext、notes

## 转换规则

1. 提取章节中所有出现的角色，填入 characters
2. 根据地点/时间/事件变化分割场景
3. 准确提取对白，保留原文
4. 叙述性文字转为舞台指示
5. 根据上下文推断情绪
6. 保持角色名一致

## 输出

只输出 JSON，无其他文字。`;

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
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 8192,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { success: false, error: "LLM returned empty response" };
    }

    // Parse JSON response (guaranteed valid by json_object mode)
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { success: false, error: `Invalid JSON response from LLM: ${content.slice(0, 200)}` };
    }

    // Extract and validate characters
    const rawCharacters = Array.isArray(parsed.characters) ? parsed.characters : [];
    const characters: Character[] = [];
    for (const raw of rawCharacters) {
      const charResult = CharacterSchema.safeParse(raw);
      if (charResult.success) {
        characters.push(charResult.data);
      }
    }

    // Validate chapter screenplay (remove characters from parsed before validation)
    const { characters: _, ...chapterData } = parsed;
    const result = ChapterScreenplaySchema.safeParse(chapterData);
    if (!result.success) {
      return {
        success: false,
        error: `Schema validation failed: ${result.error.message}`,
      };
    }

    return { success: true, data: result.data, characters };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `LLM API error: ${message}` };
  }
}
