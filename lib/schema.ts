import { z } from "zod";

// ─── 角色实体（方案C思想：角色是全局独立实体） ───

export const CharacterSchema = z.object({
  id: z.string().describe("唯一标识，格式 CHAR_N"),
  name: z.string().describe("角色姓名"),
  aliases: z.array(z.string()).describe("别名/别称/昵称，用于跨章节统一识别"),
  role: z.string().describe("角色定位，如'主角'、'反派'、'配角'"),
  description: z.string().describe("外貌与身份简介"),
  traits: z.array(z.string()).describe("性格特征"),
});

// ─── 场景内部结构 ───

export const DialogueSchema = z.object({
  index: z.number().int().describe("对话序号，从1开始"),
  speaker: z.string().describe("说话角色名称"),
  to: z.string().optional().describe("对话对象名称"),
  text: z.string().describe("台词原文"),
  emotion: z.string().optional().describe("情绪标注，如'愤怒'、'无奈'、'平静'"),
  action: z.string().optional().describe("伴随动作/舞台指示"),
  subtext: z.string().optional().describe("潜台词——角色实际想表达的，非字面意思"),
});

export const SceneSchema = z.object({
  scene_id: z.string().describe("格式 CH{章节号}_SC{场景序号}，如 CH1_SC2"),
  scene_heading: z.string().describe("标准场景头：INT./EXT. 地点 - 时间，如'INT. 咖啡厅 - 下午'"),
  location: z.string().describe("场景地点"),
  time: z.string().describe("时间描述"),
  characters_present: z.array(z.string()).describe("本场出场角色名称列表"),
  action: z.string().describe("场景动作描写，叙述性文字转舞台指示"),
  dialogues: z.array(DialogueSchema).describe("对话序列"),
  notes: z.string().optional().describe("导演/编剧备注"),
});

// ─── 章节级结构 ───

export const ChapterScreenplaySchema = z.object({
  chapter_number: z.number().int().describe("章节序号"),
  chapter_title: z.string().describe("章节标题"),
  scene_count: z.number().int().describe("本场场景数量"),
  scenes: z.array(SceneSchema).describe("场景序列"),
});

// ─── 顶层剧本（方案A外壳：专业剧本元数据） ───

export const ScreenplaySchema = z.object({
  meta: z.object({
    screenplay_title: z.string().describe("剧本标题"),
    adaptation_of: z.string().describe("改编自哪部小说"),
    author: z.string().describe("改编者"),
    draft_version: z.string().default("1.0").describe("版本号"),
    chapters_included: z.array(z.number().int()).describe("包含的章节序号"),
    generated_at: z.string().describe("生成时间 ISO 格式"),
  }),
  characters: z.array(CharacterSchema).describe("全局角色实体列表（跨章节去重）"),
  chapters: z.array(ChapterScreenplaySchema).describe("按章节组织的剧本内容"),
});

// ─── 导出类型 ───

export type Character = z.infer<typeof CharacterSchema>;
export type Dialogue = z.infer<typeof DialogueSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type ChapterScreenplay = z.infer<typeof ChapterScreenplaySchema>;
export type Screenplay = z.infer<typeof ScreenplaySchema>;

// ─── Schema 验证工具 ───

export function validateScreenplay(data: unknown): {
  success: boolean;
  data?: Screenplay;
  error?: string;
} {
  const result = ScreenplaySchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.message };
}
