"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Play, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import type { ChapterItem } from "@/types/app";

interface ChapterListProps {
  chapters: ChapterItem[];
  selectedChapters: Set<number>;
  warnings: string[];
  isConverting: boolean;
  onToggleChapter: (number: number) => void;
  onToggleAll: () => void;
  onConvert: () => void;
  onRetry: (chapterNumber: number) => void;
}

export function ChapterList({
  chapters,
  selectedChapters,
  warnings,
  isConverting,
  onToggleChapter,
  onToggleAll,
  onConvert,
  onRetry,
}: ChapterListProps) {
  const doneCount = chapters.filter((c) => c.status === "done").length;
  const convertingCount = chapters.filter((c) => c.status === "converting").length;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-8">
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base">
              章节列表
              <Badge variant="secondary" className="ml-2 text-xs">{chapters.length} 章</Badge>
            </CardTitle>
            {doneCount > 0 && <p className="text-xs text-muted-foreground mt-0.5">{doneCount} 已完成{convertingCount > 0 ? ` · ${convertingCount} 转换中` : ""}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onToggleAll} className="text-xs h-9">
              {selectedChapters.size === chapters.length ? "取消全选" : "全选"}
            </Button>
            <Button onClick={onConvert} disabled={selectedChapters.size === 0 || isConverting} size="sm" className="bg-rose-500 hover:bg-rose-600 text-white h-9">
              {isConverting ? <Loader2 className="mr-1 size-3 animate-spin" /> : <Play className="mr-1 size-3" />}
              转换 ({selectedChapters.size})
            </Button>
          </div>
        </CardHeader>
        {warnings.length > 0 && (
          <div className="px-4 pb-3">
            {warnings.map((w) => (
              <p key={w} className={`text-xs rounded-md px-3 py-1.5 ${w.includes("过长") ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10" : "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10"}`}>{w}</p>
            ))}
          </div>
        )}
        <CardContent>
          <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
            {chapters.map((chapter) => (
              <div key={chapter.number} className="flex items-center gap-2.5 rounded-lg border border-border p-2.5 hover:bg-accent/50 transition-colors">
                <Checkbox checked={selectedChapters.has(chapter.number)} onCheckedChange={() => onToggleChapter(chapter.number)} disabled={chapter.status === "converting"} className="h-5 w-5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{chapter.title}</span>
                    {chapter.status === "pending" && <Badge variant="outline" className="text-[10px] px-1.5">待转换</Badge>}
                    {chapter.status === "converting" && <Badge variant="secondary" className="text-[10px] px-1.5"><Loader2 className="mr-0.5 size-2 animate-spin" />转换中</Badge>}
                    {chapter.status === "done" && <Badge className="text-[10px] px-1.5 bg-green-500"><CheckCircle2 className="mr-0.5 size-2" />完成</Badge>}
                    {chapter.status === "error" && (
                      <>
                        <Badge variant="destructive" className="text-[10px] px-1.5"><AlertCircle className="mr-0.5 size-2" />失败</Badge>
                        <button
                          onClick={() => onRetry(chapter.number)}
                          className="text-[10px] text-blue-500 hover:text-blue-600 hover:underline"
                        >
                          重试
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {chapter.status === "error" && chapter.error && (
                  <p className={`text-[10px] max-w-[200px] truncate ${chapter.error.includes("429") || chapter.error.includes("rate limit") ? "text-amber-600 dark:text-amber-400" : "text-destructive"}`}>
                    {chapter.error.includes("429") || chapter.error.includes("rate limit")
                      ? "请求过于频繁，请稍后重试"
                      : chapter.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
