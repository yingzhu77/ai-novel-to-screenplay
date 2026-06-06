"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Play, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export interface ChapterItem {
  number: number;
  title: string;
  content: string;
  status: "pending" | "converting" | "done" | "error";
  error?: string;
}

interface ChapterListProps {
  chapters: ChapterItem[];
  selectedChapters: Set<number>;
  onToggleChapter: (number: number) => void;
  onToggleAll: () => void;
  onConvert: () => void;
  isConverting: boolean;
}

export function ChapterList({
  chapters,
  selectedChapters,
  onToggleChapter,
  onToggleAll,
  onConvert,
  isConverting,
}: ChapterListProps) {
  const allSelected = chapters.length > 0 && chapters.every((c) => selectedChapters.has(c.number));
  const doneCount = chapters.filter((c) => c.status === "done").length;
  const convertingCount = chapters.filter((c) => c.status === "converting").length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg">
            章节列表
            <Badge variant="secondary" className="ml-2">
              {chapters.length} 章
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {doneCount > 0 && `${doneCount} 已完成`}
            {convertingCount > 0 && ` · ${convertingCount} 转换中`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleAll}
          >
            {allSelected ? "取消全选" : "全选"}
          </Button>
          <Button
            onClick={onConvert}
            disabled={selectedChapters.size === 0 || isConverting}
          >
            {isConverting ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Play className="mr-2 size-4" />
            )}
            转换选中章节 ({selectedChapters.size})
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {chapters.map((chapter) => (
            <div
              key={chapter.number}
              className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                checked={selectedChapters.has(chapter.number)}
                onCheckedChange={() => onToggleChapter(chapter.number)}
                disabled={chapter.status === "converting"}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{chapter.title}</span>
                  <StatusBadge status={chapter.status} />
                </div>
                <p className="text-sm text-muted-foreground truncate mt-0.5">
                  {chapter.content.slice(0, 100)}...
                </p>
              </div>

              {chapter.status === "error" && chapter.error && (
                <p className="text-xs text-destructive max-w-[200px] truncate">
                  {chapter.error}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: ChapterItem["status"] }) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="outline" className="text-xs">
          待转换
        </Badge>
      );
    case "converting":
      return (
        <Badge variant="secondary" className="text-xs">
          <Loader2 className="mr-1 size-3 animate-spin" />
          转换中
        </Badge>
      );
    case "done":
      return (
        <Badge variant="default" className="text-xs bg-green-600">
          <CheckCircle2 className="mr-1 size-3" />
          完成
        </Badge>
      );
    case "error":
      return (
        <Badge variant="destructive" className="text-xs">
          <AlertCircle className="mr-1 size-3" />
          失败
        </Badge>
      );
  }
}
