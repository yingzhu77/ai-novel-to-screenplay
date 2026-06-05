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

{"chapter_number":1,"chapter_title":"第一章 标题","scene_count":1,"characters":[{"id":"CHAR_1","name":"角色名","aliases":[],"role":"主角/配角","description":"简介","traits":["特征"]}],"scenes":[{"scene_id":"CH1_SC1","scene_heading":"INT. 地点 - 时间","location":"地点名","time":"时间描述","characters_present":["角色A"],"action":"舞台指示/动作描写文字","dialogues":[{"index":1,"speaker":"说话人","text":"台词内容","emotion":"情绪","action":"伴随动作"}]}]}

## 字段说明

characters 数组：
- id: 唯一标识，格式 CHAR_N（N 从 1 递增）
- name: 角色姓名（使用小说中的原名）
- aliases: 别名/昵称列表，无则为空数组
- role: "主角"、"反派"、"配角" 之一
- description: 外貌与身份简介（从原文提取）
- traits: 性格特征数组（从行为推断）

scenes 数组：
- scene_id: 格式 CH{章节号}_SC{场景序号}，如 CH1_SC1
- scene_heading: 格式 "INT./EXT. 具体地点 - 时间描述"（如 "INT. 客栈大堂 - 傍晚"）
- location: 具体地点名称
- time: 时间描述（如"清晨"、"深夜"、"午后"）
- characters_present: 本场出场角色名
- action: 将叙述文字改写为舞台指示（第三人称 present tense，描述动作和环境）
- dialogues: 对话数组，每项必须有 index、speaker、text
- 可选字段：emotion（情绪）、action（伴随动作）、subtext（潜台词）、notes（编剧备注）

## 转换规则

1. 角色提取：从章节中提取所有出现的角色，包括只提到名字的角色
2. 场景分割：根据以下变化分割场景——地点变换、时间跳跃、主要事件切换、新角色登场
3. 对话提取：准确提取所有对白，保留原文措辞，不要改写台词
4. 舞台指示：将叙述性文字改写为简洁的舞台指示，使用 present tense（"张三走进"而非"张三走了进去"）
5. 情绪标注：根据上下文推断每句台词的情绪（如平静、愤怒、无奈、紧张、喜悦）
6. 伴随动作：如果台词伴有动作（如"拍桌子说"），填入 action 字段
7. 角色一致性：同一角色在不同场景中的名字、描述必须一致

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

    // Normalize LLM response: handle common variations
    // Some models wrap in { chapters: [...] } or include { meta: {...} }
    let chapterData: Record<string, unknown> = { ...parsed };
    delete chapterData.characters;
    delete chapterData.meta;
    if (Array.isArray(chapterData.chapters) && chapterData.chapters.length > 0) {
      chapterData = chapterData.chapters[0] as Record<string, unknown>;
    }
    delete chapterData.characters;

    const result = ChapterScreenplaySchema.safeParse(chapterData);
    if (!result.success) {
      console.error("Schema validation error:", result.error.message);
      console.error("LLM response keys:", Object.keys(parsed));
      console.error("Normalized chapter keys:", Object.keys(chapterData));
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
