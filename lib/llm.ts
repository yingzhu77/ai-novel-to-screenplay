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

const SYSTEM_PROMPT = `小说转剧本JSON。字段名不可改动：

{"chapter_number":1,"chapter_title":"","scene_count":1,"characters":[{"id":"CHAR_1","name":"","aliases":[],"role":"主角/反派/配角","description":"","traits":[]}],"scenes":[{"scene_id":"CH1_SC1","scene_heading":"INT. 地点 - 时间","location":"","time":"","characters_present":[],"action":"舞台指示","dialogues":[{"index":1,"speaker":"","text":"","emotion":"","action":""}]}]}

规则：
1. characters提取所有角色，id格式CHAR_N
2. role判断标准：
   - 主角：故事围绕其展开，读者代入其视角，经历成长或变化
   - 反派：有明确的负面行为（如欺骗、背叛、陷害、阻挠），与主角产生直接冲突，被揭露或击败
   - 配角：没有负面行为，辅助或帮助主角，或只是背景人物
3. 判断方法：如果角色在故事中有以下行为，应标记为反派：
   - 对主角撒谎或隐瞒真相
   - 背叛或出卖主角
   - 阻挠主角的目标
   - 最终被揭露或受到惩罚
4. scenes按地点/时间/事件变化分割
5. scene_heading必须INT./EXT.开头
6. action用present tense改写叙述
7. dialogues保留原文台词，emotion推断情绪
8. 只输出JSON。`;

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
      max_tokens: 4096,
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
