export interface ChapterItem {
  number: number;
  title: string;
  content: string;
  status: "pending" | "converting" | "done" | "error";
  error?: string;
}

export interface HistoryItem {
  id: string;
  title: string;
  chapterCount: number;
  characterCount: number;
  cloudUrl: string | null;
  createdAt: string;
}
