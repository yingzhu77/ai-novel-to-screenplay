"use client";

import { Loader2 } from "lucide-react";

interface ConversionProgressProps {
  current: number;
  total: number;
  chapterTitle: string;
}

export function ConversionProgress({ current, total, chapterTitle }: ConversionProgressProps) {
  if (total === 0) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-6">
      <div className="rounded-xl bg-card border border-border p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin text-rose-500" />
            <span className="text-sm font-medium">
              正在转换 {current}/{total} 章
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {Math.round((current / total) * 100)}%
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-rose-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(current / total) * 100}%` }}
          />
        </div>
        {chapterTitle && (
          <p className="text-xs text-muted-foreground mt-2 truncate">
            {chapterTitle}
          </p>
        )}
      </div>
    </div>
  );
}
