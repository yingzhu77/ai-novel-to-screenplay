// 从 lib/schema.ts 的 Zod Schema 派生的纯 TypeScript 类型
// 用于前端组件和 API 接口的类型声明

export interface ScreenplayMeta {
  screenplay_title: string;
  adaptation_of: string;
  author: string;
  draft_version: string;
  chapters_included: number[];
  generated_at: string;
}

export interface Character {
  id: string;         // CHAR_N
  name: string;
  aliases: string[];
  role: string;
  description: string;
  traits: string[];
}

export interface Dialogue {
  index: number;
  speaker: string;
  to?: string;
  text: string;
  emotion?: string;
  action?: string;
  subtext?: string;
}

export interface Scene {
  scene_id: string;   // CH{chapter}_SC{scene}
  scene_heading: string;
  location: string;
  time: string;
  characters_present: string[];
  action: string;
  dialogues: Dialogue[];
  notes?: string;
}

export interface ChapterScreenplay {
  chapter_number: number;
  chapter_title: string;
  scene_count: number;
  scenes: Scene[];
}

export interface Screenplay {
  meta: ScreenplayMeta;
  characters: Character[];
  chapters: ChapterScreenplay[];
}

// API 请求/响应类型
export interface ConvertRequest {
  chapterNumber: number;
  chapterTitle: string;
  chapterContent: string;
  existingCharacters?: Character[];  // 已提取的角色，用于跨章节一致性
}

export interface ConvertResponse {
  success: boolean;
  data?: ChapterScreenplay & { new_characters: Character[] };
  error?: string;
}

export interface ParseNovelResponse {
  success: boolean;
  data?: {
    title: string;
    chapters: { number: number; title: string; content: string }[];
  };
  error?: string;
}
