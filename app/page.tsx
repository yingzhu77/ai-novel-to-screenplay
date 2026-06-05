"use client";

import { useState, useCallback } from "react";
import { NovelInput } from "@/components/novel-input";
import { ChapterList, type ChapterItem } from "@/components/chapter-list";
import { ScreenplayViewer } from "@/components/screenplay-viewer";
import type { Screenplay, Character, ChapterScreenplay } from "@/lib/schema";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  const [novelText, setNovelText] = useState("");
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [selectedChapters, setSelectedChapters] = useState<Set<number>>(new Set());
  const [isParsing, setIsParsing] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [screenplay, setScreenplay] = useState<Screenplay | null>(null);
  const [existingCharacters, setExistingCharacters] = useState<Character[]>([]);

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
      if (!data.success) {
        alert(`解析失败: ${data.error}`);
        return;
      }

      const parsed: ChapterItem[] = data.data.chapters.map(
        (c: { number: number; title: string; content: string }) => ({
          ...c,
          status: "pending" as const,
        })
      );

      setChapters(parsed);
      setSelectedChapters(new Set(parsed.map((c: ChapterItem) => c.number)));
      setScreenplay(null);
      setExistingCharacters([]);
    } catch (err) {
      alert(`解析出错: ${err instanceof Error ? err.message : "未知错误"}`);
    } finally {
      setIsParsing(false);
    }
  }, [novelText]);

  const handleToggleChapter = useCallback((number: number) => {
    setSelectedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(number)) {
        next.delete(number);
      } else {
        next.add(number);
      }
      return next;
    });
  }, []);

  const handleToggleAll = useCallback(() => {
    setSelectedChapters((prev) => {
      if (prev.size === chapters.length) {
        return new Set();
      }
      return new Set(chapters.map((c) => c.number));
    });
  }, [chapters]);

  const handleConvert = useCallback(async () => {
    const toConvert = chapters.filter(
      (c) => selectedChapters.has(c.number) && c.status !== "done"
    );

    if (toConvert.length === 0) return;
    setIsConverting(true);

    const allScenes: ChapterScreenplay[] = [];
    const allCharacters = [...existingCharacters];
    const novelTitle = "Novel";

    for (const chapter of toConvert) {
      // Mark as converting
      setChapters((prev) =>
        prev.map((c) =>
          c.number === chapter.number ? { ...c, status: "converting" as const } : c
        )
      );

      try {
        const res = await fetch("/api/convert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chapterNumber: chapter.number,
            chapterTitle: chapter.title,
            chapterContent: chapter.content,
            existingCharacters: allCharacters,
          }),
        });

        const data = await res.json();

        if (!data.success) {
          setChapters((prev) =>
            prev.map((c) =>
              c.number === chapter.number
                ? { ...c, status: "error" as const, error: data.error }
                : c
            )
          );
          continue;
        }

        const chapterData = data.data as ChapterScreenplay & {
          new_characters?: Character[];
        };

        allScenes.push(chapterData);

        // Mark as done
        setChapters((prev) =>
          prev.map((c) =>
            c.number === chapter.number ? { ...c, status: "done" as const } : c
          )
        );
      } catch (err) {
        setChapters((prev) =>
          prev.map((c) =>
            c.number === chapter.number
              ? {
                  ...c,
                  status: "error" as const,
                  error: err instanceof Error ? err.message : "未知错误",
                }
              : c
          )
        );
      }
    }

    // Build final screenplay
    if (allScenes.length > 0) {
      const finalScreenplay: Screenplay = {
        meta: {
          screenplay_title: novelTitle,
          adaptation_of: novelTitle,
          author: "AI",
          draft_version: "1.0",
          chapters_included: allScenes.map((s) => s.chapter_number),
          generated_at: new Date().toISOString(),
        },
        characters: allCharacters,
        chapters: allScenes,
      };

      setScreenplay(finalScreenplay);
    }

    setIsConverting(false);
  }, [chapters, selectedChapters, existingCharacters]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold">AI Novel to Screenplay</h1>
          <p className="text-muted-foreground mt-1">
            将小说文本自动转换为结构化剧本（YAML 格式）
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <NovelInput
          value={novelText}
          onChange={setNovelText}
          onParse={handleParse}
          isParsing={isParsing}
        />

        {chapters.length > 0 && (
          <>
            <Separator />
            <ChapterList
              chapters={chapters}
              selectedChapters={selectedChapters}
              onToggleChapter={handleToggleChapter}
              onToggleAll={handleToggleAll}
              onConvert={handleConvert}
              isConverting={isConverting}
            />
          </>
        )}

        {screenplay && (
          <>
            <Separator />
            <ScreenplayViewer screenplay={screenplay} />
          </>
        )}
      </main>

      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          AI Novel to Screenplay — 七牛云 × XEngineer 暑期实训营
        </div>
      </footer>
    </div>
  );
}
