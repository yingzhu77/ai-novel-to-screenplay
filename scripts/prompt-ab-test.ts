/**
 * Prompt A/B 测试脚本
 * 比较不同 Prompt 版本的转换质量
 *
 * 运行: npx tsx scripts/prompt-ab-test.ts
 */

import OpenAI from "openai";

const API_KEY = "sk-c64d57d70faaf223d824735aab08da1da841e0d9bb5fd231110e8def0f1d349d";
const BASE_URL = "https://openai.qiniu.com/v1";
const MODEL = "deepseek/deepseek-v4-flash";

const TEST_CHAPTER = `第一章 初入江湖

清晨的阳光洒在青石板路上，年轻的剑客张三背着一把长剑走进了望月镇。他面容清秀，眼神坚定，一看就是练家子。

他走进了一家客栈，客栈里弥漫着酒香。角落里坐着一个独眼的中年男人李四，正在独自喝酒，脸上有一道长长的刀疤。

张三走到柜台前，对掌柜王老头说："老板，来一壶酒，再切二两牛肉。"

王老头点点头，转身去准备。

李四抬起头，冷冷地看了张三一眼，又低下头继续喝酒。

张三端起酒碗，朝李四的方向举了举。"这位大哥，一个人喝酒多没意思，不如过来坐坐？"

李四没有说话，只是把酒碗往嘴边送了一口。`;

// Prompt A: 当前精简版
const PROMPT_A = `小说转剧本JSON。字段名不可改动：

{"chapter_number":1,"chapter_title":"","scene_count":1,"characters":[{"id":"CHAR_1","name":"","aliases":[],"role":"主角/配角","description":"","traits":[]}],"scenes":[{"scene_id":"CH1_SC1","scene_heading":"INT. 地点 - 时间","location":"","time":"","characters_present":[],"action":"舞台指示","dialogues":[{"index":1,"speaker":"","text":"","emotion":"","action":""}]}]}

规则：
1. characters提取所有角色，id格式CHAR_N
2. scenes按地点/时间/事件变化分割
3. scene_heading必须INT./EXT.开头
4. action用present tense改写叙述
5. dialogues保留原文台词，emotion推断情绪
6. 只输出JSON。`;

// Prompt B: 详细版（带字段说明）
const PROMPT_B = `你是一位专业的剧本改编师。将小说章节转换为 JSON 格式的剧本。

## 输出结构

{"chapter_number":1,"chapter_title":"标题","scene_count":1,"characters":[{"id":"CHAR_1","name":"姓名","aliases":[],"role":"主角/配角/反派","description":"外貌身份","traits":["特征1","特征2"]}],"scenes":[{"scene_id":"CH1_SC1","scene_heading":"INT. 地点 - 时间","location":"地点","time":"时间","characters_present":["角色"],"action":"舞台指示","dialogues":[{"index":1,"speaker":"说话人","text":"台词","emotion":"情绪","action":"伴随动作"}]}]}

## 规则
1. characters：提取所有出现的角色，包括只提到名字的
2. scenes：按地点变换、时间跳跃、事件切换分割
3. scene_heading：必须 INT./EXT. 开头
4. action：用 present tense 改写叙述为舞台指示
5. dialogues：保留原文台词，emotion 根据上下文推断
6. 只输出 JSON，无其他文字`;

// Prompt C: 示例驱动版（带完整示例）
const PROMPT_C = `将小说转为剧本JSON。参考以下示例：

输入："张三走进酒馆说：老板来壶酒。角落里王五在喝酒。"

输出：
{"chapter_number":1,"chapter_title":"","scene_count":1,"characters":[{"id":"CHAR_1","name":"张三","aliases":[],"role":"主角","description":"酒客","traits":[]}],"scenes":[{"scene_id":"CH1_SC1","scene_heading":"INT. 酒馆 - 日","location":"酒馆","time":"日","characters_present":["张三","王五"],"action":"张三走进酒馆。","dialogues":[{"index":1,"speaker":"张三","text":"老板来壶酒。","emotion":"平静"}]}]}

字段名不可改动。只输出JSON。`;

const PROMPTS = [
  { name: "A: 精简版", prompt: PROMPT_A },
  { name: "B: 详细版", prompt: PROMPT_B },
  { name: "C: 示例驱动", prompt: PROMPT_C },
];

interface EvalResult {
  name: string;
  time: number;
  schemaValid: boolean;
  characterCount: number;
  sceneCount: number;
  dialogueCount: number;
  hasEmotion: boolean;
  hasAction: boolean;
  error?: string;
}

async function testPrompt(name: string, systemPrompt: string): Promise<EvalResult> {
  const client = new OpenAI({ apiKey: API_KEY, baseURL: BASE_URL });
  const start = Date.now();

  try {
    const r = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `章节号：1，标题：第一章 初入江湖\n\n${TEST_CHAPTER}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 4096,
    });

    const time = Date.now() - start;
    const content = r.choices[0]?.message?.content || "";
    const parsed = JSON.parse(content);

    // Schema validation
    const { ChapterScreenplaySchema, CharacterSchema } = await import("../lib/schema");
    const { characters: _c, ...chapterData } = parsed;
    const schemaResult = ChapterScreenplaySchema.safeParse(chapterData);

    const characters = Array.isArray(parsed.characters) ? parsed.characters : [];
    const scenes = parsed.scenes || [];
    const dialogues = scenes.flatMap((s: any) => s.dialogues || []);

    return {
      name,
      time,
      schemaValid: schemaResult.success,
      characterCount: characters.length,
      sceneCount: scenes.length,
      dialogueCount: dialogues.length,
      hasEmotion: dialogues.some((d: any) => d.emotion),
      hasAction: dialogues.some((d: any) => d.action),
    };
  } catch (err) {
    return {
      name,
      time: Date.now() - start,
      schemaValid: false,
      characterCount: 0,
      sceneCount: 0,
      dialogueCount: 0,
      hasEmotion: false,
      hasAction: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main() {
  console.log("=== Prompt A/B 测试 ===\n");
  console.log("测试内容：第一章 初入江湖（~200字）\n");

  const results: EvalResult[] = [];
  for (const p of PROMPTS) {
    console.log(`测试 ${p.name}...`);
    const result = await testPrompt(p.name, p.prompt);
    results.push(result);
    console.log(`  完成 (${result.time}ms)`);
  }

  console.log("\n=== 结果对比 ===\n");
  console.log("| 指标 | " + results.map((r) => r.name).join(" | ") + " |");
  console.log("|------|" + results.map(() => "------").join("|") + "|");
  console.log("| 响应时间 | " + results.map((r) => `${r.time}ms`).join(" | ") + " |");
  console.log("| Schema 验证 | " + results.map((r) => r.schemaValid ? "通过" : "失败").join(" | ") + " |");
  console.log("| 角色数 | " + results.map((r) => r.characterCount).join(" | ") + " |");
  console.log("| 场景数 | " + results.map((r) => r.sceneCount).join(" | ") + " |");
  console.log("| 对话数 | " + results.map((r) => r.dialogueCount).join(" | ") + " |");
  console.log("| 有情绪标注 | " + results.map((r) => r.hasEmotion ? "是" : "否").join(" | ") + " |");
  console.log("| 有伴随动作 | " + results.map((r) => r.hasAction ? "是" : "否").join(" | ") + " |");

  const best = results.filter((r) => r.schemaValid).sort((a, b) => {
    // Score: characterCount + sceneCount + dialogueCount + emotion + action - time/1000
    const scoreA = a.characterCount + a.sceneCount + a.dialogueCount + (a.hasEmotion ? 1 : 0) + (a.hasAction ? 1 : 0) - a.time / 5000;
    const scoreB = b.characterCount + b.sceneCount + b.dialogueCount + (b.hasEmotion ? 1 : 0) + (b.hasAction ? 1 : 0) - b.time / 5000;
    return scoreB - scoreA;
  });

  if (best.length > 0) {
    console.log(`\n推荐: ${best[0].name} (综合得分最高)`);
  } else {
    console.log("\n所有 Prompt 均未通过 Schema 验证");
  }
}

main();
