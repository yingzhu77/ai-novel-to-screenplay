"use client";

import { useState, useCallback, useEffect } from "react";
import { Navbar } from "@/components/app/Navbar";
import { InputSection } from "@/components/app/InputSection";
import { ChapterList } from "@/components/app/ChapterList";
import { ConversionProgress } from "@/components/app/ConversionProgress";
import { ScreenplayOutput } from "@/components/app/ScreenplayOutput";
import { HistoryPanel } from "@/components/app/HistoryPanel";
import type { ChapterItem, HistoryItem } from "@/types/app";
import type { Screenplay, Character, ChapterScreenplay } from "@/lib/schema";

const HISTORY_KEY = "screenwriter-history";
const MAX_HISTORY = 10;

function loadHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch { return []; }
}

function saveHistory(item: HistoryItem) {
  const history = loadHistory().filter((h) => h.id !== item.id);
  history.unshift(item);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

export default function Home() {
  const [novelText, setNovelText] = useState("");
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [selectedChapters, setSelectedChapters] = useState<Set<number>>(new Set());
  const [isParsing, setIsParsing] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [screenplay, setScreenplay] = useState<Screenplay | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [cloudUrl, setCloudUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [cloudConsent, setCloudConsent] = useState(false);
  const [convertProgress, setConvertProgress] = useState({ current: 0, total: 0, chapterTitle: "" });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [viewMode, setViewMode] = useState<"input" | "result">("input");
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: number; chapters: number }[]>([]);

  useEffect(() => { setHistory(loadHistory()); }, []);

  const processFiles = async (files: File[]) => {
    const validFiles = files.filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase();
      return ext === "txt" || ext === "md" || ext === "docx";
    });
    if (validFiles.length === 0) { alert("目前仅支持 .txt、.md 和 .docx 文件"); return; }

    let allText = "";
    const fileInfo: { name: string; size: number; chapters: number }[] = [];
    for (const file of validFiles) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      let text: string;
      if (ext === "docx") {
        const arrayBuffer = await file.arrayBuffer();
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else {
        text = await file.text();
      }
      allText += (allText ? "\n\n" : "") + text;
      const chapterMatches = text.match(/^(#{0,3}\s*)(第[一二三四五六七八九十百零〇\d]+[章节回幕]|Chapter\s+\d+)/gim);
      fileInfo.push({ name: file.name, size: file.size, chapters: chapterMatches?.length || 1 });
    }
    setNovelText(allText);
    setUploadedFiles(fileInfo);
  };

  const handleParse = useCallback(async () => {
    if (!novelText.trim()) return;
    setIsParsing(true);
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: novelText }),
      });
      const data = await res.json();
      if (!data.success) { alert(`解析失败: ${data.error}`); return; }
      const parsed: ChapterItem[] = data.data.chapters.map(
        (c: { number: number; title: string; content: string }) => ({ ...c, status: "pending" as const })
      );
      setChapters(parsed);
      setSelectedChapters(new Set(parsed.map((c: ChapterItem) => c.number)));
      setScreenplay(null);
      setViewMode("result");
      const longChapters = parsed.filter((c) => c.content.length > 6000);
      const veryLongChapters = parsed.filter((c) => c.content.length > 12000);
      if (veryLongChapters.length > 0) {
        setWarnings(veryLongChapters.map((c) => `${c.title} 内容过长（${c.content.length} 字），建议拆分为多个章节后再转换，否则可能截断或转换失败`));
      } else if (longChapters.length > 0) {
        setWarnings(longChapters.map((c) => `${c.title} 内容较长（${c.content.length} 字），转换时间可能较长，建议拆分`));
      } else {
        setWarnings([]);
      }
    } catch (err) {
      alert(`解析出错: ${err instanceof Error ? err.message : "未知错误"}`);
    } finally {
      setIsParsing(false);
    }
  }, [novelText]);

  const handleToggleChapter = useCallback((number: number) => {
    setSelectedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(number)) next.delete(number); else next.add(number);
      return next;
    });
  }, []);

  const handleToggleAll = useCallback(() => {
    setSelectedChapters((prev) => prev.size === chapters.length ? new Set() : new Set(chapters.map((c) => c.number)));
  }, [chapters]);

  const handleConvert = useCallback(async () => {
    const toConvert = chapters.filter((c) => selectedChapters.has(c.number) && c.status !== "done");
    if (toConvert.length === 0) return;
    setIsConverting(true);
    setConvertProgress({ current: 0, total: toConvert.length, chapterTitle: "准备中..." });

    try {
      const res = await fetch("/api/convert-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapters: toConvert.map((c) => ({ number: c.number, title: c.title, content: c.content })),
          existingCharacters: [],
        }),
      });

      if (!res.ok) throw new Error(`Stream request failed: ${res.status}`);
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let eventType = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7);
            } else if (line.startsWith("data: ")) {
              let data: Record<string, unknown>;
              try { data = JSON.parse(line.slice(6)); } catch { continue; }

              if (eventType === "start") {
                setConvertProgress({ current: 0, total: data.total as number, chapterTitle: "准备中..." });
              } else if (eventType === "chapter-start") {
                setChapters((prev) => prev.map((c) => c.number === data.number ? { ...c, status: "converting" as const } : c));
                setConvertProgress((prev) => ({ ...prev, current: data.index as number, chapterTitle: data.title as string }));
              } else if (eventType === "chapter-done") {
                setChapters((prev) => prev.map((c) => c.number === data.number ? { ...c, status: "done" as const } : c));
                setConvertProgress((prev) => ({ ...prev, current: (data.index as number) + 1 }));
              } else if (eventType === "chapter-error") {
                setChapters((prev) => prev.map((c) => c.number === data.number ? { ...c, status: "error" as const, error: data.error as string } : c));
              } else if (eventType === "done" && (data.scenes as ChapterScreenplay[]).length > 0) {
                const scenes = data.scenes as ChapterScreenplay[];
                const characters = data.characters as Character[];
                const finalScreenplay: Screenplay = {
                  meta: { screenplay_title: "AI Screenplay", adaptation_of: "Novel", author: "AI", draft_version: "1.0", chapters_included: scenes.map((s) => s.chapter_number), generated_at: new Date().toISOString() },
                  characters,
                  chapters: scenes,
                };
                setScreenplay(finalScreenplay);

                const chapterTitles = scenes.map((s) => s.chapter_title);
                const historyTitle = chapterTitles.length > 0
                  ? (chapterTitles.length <= 2 ? chapterTitles.join(" / ") : `${chapterTitles[0]} / ${chapterTitles[1]} 等${chapterTitles.length}章`)
                  : "AI Screenplay";

                const historyItem: HistoryItem = {
                  id: `${Date.now()}`, title: historyTitle,
                  chapterCount: finalScreenplay.chapters.length, characterCount: finalScreenplay.characters.length,
                  cloudUrl: null, createdAt: new Date().toISOString(),
                };
                saveHistory(historyItem);
                setHistory(loadHistory());
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (err) {
      alert(`转换出错: ${err instanceof Error ? err.message : "未知错误"}`);
    } finally {
      setIsConverting(false);
      setConvertProgress({ current: 0, total: 0, chapterTitle: "" });
    }
  }, [chapters, selectedChapters]);

  const handleRetry = useCallback(async (chapterNumber: number) => {
    const chapter = chapters.find((c) => c.number === chapterNumber);
    if (!chapter || chapter.status !== "error") return;

    setIsConverting(true);
    setConvertProgress({ current: 0, total: 1, chapterTitle: chapter.title });

    try {
      const res = await fetch("/api/convert-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapters: [{ number: chapter.number, title: chapter.title, content: chapter.content }],
          existingCharacters: [],
        }),
      });

      if (!res.ok) throw new Error(`Stream request failed: ${res.status}`);
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let eventType = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7);
            } else if (line.startsWith("data: ")) {
              let data: Record<string, unknown>;
              try { data = JSON.parse(line.slice(6)); } catch { continue; }

              if (eventType === "chapter-start") {
                setChapters((prev) => prev.map((c) => c.number === data.number ? { ...c, status: "converting" as const } : c));
              } else if (eventType === "chapter-done") {
                setChapters((prev) => prev.map((c) => c.number === data.number ? { ...c, status: "done" as const } : c));
                // Update screenplay with new chapter data
                if (data.data) {
                  setScreenplay((prev) => {
                    if (!prev) return prev;
                    const newData = data.data as ChapterScreenplay;
                    const updatedChapters = prev.chapters.map((ch) =>
                      ch.chapter_number === newData.chapter_number ? newData : ch
                    );
                    return { ...prev, chapters: updatedChapters };
                  });
                }
              } else if (eventType === "chapter-error") {
                setChapters((prev) => prev.map((c) => c.number === data.number ? { ...c, status: "error" as const, error: data.error as string } : c));
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (err) {
      setChapters((prev) => prev.map((c) => c.number === chapterNumber ? { ...c, status: "error" as const, error: err instanceof Error ? err.message : "Unknown error" } : c));
    } finally {
      setIsConverting(false);
      setConvertProgress({ current: 0, total: 0, chapterTitle: "" });
    }
  }, [chapters]);

  const handleCloudSave = useCallback(async () => {
    if (!screenplay || !cloudConsent) return;
    setIsSaving(true);
    setCloudUrl(null);
    try {
      const storageRes = await fetch("/api/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screenplay, format: "yaml" }),
      });
      const storageData = await storageRes.json();
      if (storageData.success && storageData.data?.downloadUrl) {
        setCloudUrl(storageData.data.downloadUrl);
        const history = loadHistory();
        if (history.length > 0) {
          history[0].cloudUrl = storageData.data.downloadUrl;
          localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
          setHistory(loadHistory());
        }
      }
    } catch { /* Storage failure is non-blocking */ }
    finally { setIsSaving(false); }
  }, [screenplay, cloudConsent]);

  const handleReset = () => {
    setViewMode("input");
    setChapters([]);
    setScreenplay(null);
    setCloudUrl(null);
    setCloudConsent(false);
    setWarnings([]);
    setConvertProgress({ current: 0, total: 0, chapterTitle: "" });
    setUploadedFiles([]);
    setNovelText("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1">
        {viewMode === "input" ? (
          <InputSection
            novelText={novelText}
            onTextChange={setNovelText}
            onParse={handleParse}
            isParsing={isParsing}
            uploadedFiles={uploadedFiles}
            onFilesUpload={processFiles}
            onRemoveFiles={() => { setUploadedFiles([]); setNovelText(""); }}
          />
        ) : (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-8">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              ← 返回上传
            </button>
          </div>
        )}

        <ConversionProgress {...convertProgress} />

        {viewMode === "result" && chapters.length > 0 && (
          <ChapterList
            chapters={chapters}
            selectedChapters={selectedChapters}
            warnings={warnings}
            isConverting={isConverting}
            onToggleChapter={handleToggleChapter}
            onToggleAll={handleToggleAll}
            onConvert={handleConvert}
            onRetry={handleRetry}
          />
        )}

        {viewMode === "result" && screenplay && (
          <ScreenplayOutput
            screenplay={screenplay}
            chapters={chapters}
            isSaving={isSaving}
            cloudUrl={cloudUrl}
            cloudConsent={cloudConsent}
            onCloudConsentChange={setCloudConsent}
            onCloudSave={handleCloudSave}
          />
        )}
      </main>

      {viewMode === "input" && <HistoryPanel history={history} />}

      <footer className="border-t border-border bg-card py-4">
        <div className="text-center text-xs text-muted-foreground">
          AI Screenwriter 2026 · Powered by DeepSeek V4 Flash & Qiniu Cloud
        </div>
      </footer>
    </div>
  );
}
