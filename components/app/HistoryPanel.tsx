"use client";

import type { HistoryItem } from "@/types/app";

interface HistoryPanelProps {
  history: HistoryItem[];
}

export function HistoryPanel({ history }: HistoryPanelProps) {
  if (history.length === 0) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-8 w-full">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">最近转换</h3>
      <div className="space-y-2">
        {history.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3 hover:bg-accent/50 transition-colors">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.chapterCount} 章 · {item.characterCount} 角色 · {new Date(item.createdAt).toLocaleDateString("zh-CN")}</p>
            </div>
            {item.cloudUrl && (
              <a href={item.cloudUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline shrink-0 ml-3">下载</a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
