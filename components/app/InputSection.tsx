"use client";

import { useRef, type ChangeEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText } from "lucide-react";

interface UploadedFile {
  name: string;
  size: number;
  chapters: number;
}

interface InputSectionProps {
  novelText: string;
  onTextChange: (text: string) => void;
  onParse: () => void;
  isParsing: boolean;
  uploadedFiles: UploadedFile[];
  onFilesUpload: (files: File[]) => void;
  onRemoveFiles: () => void;
}

export function InputSection({
  novelText,
  onTextChange,
  onParse,
  isParsing,
  uploadedFiles,
  onFilesUpload,
  onRemoveFiles,
}: InputSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await onFilesUpload(Array.from(files));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div
      className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-8 sm:pb-12 text-center"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) onFilesUpload(files);
      }}
    >
      <h1 className="text-3xl sm:text-4xl font-bold mb-3">小说转剧本</h1>
      <p className="text-base sm:text-lg text-muted-foreground mb-8 sm:mb-10">粘贴小说文本，AI 自动转换为结构化剧本，简单又快速！</p>

      <div className="bg-card rounded-2xl shadow-sm border border-border p-4 sm:p-6 mb-6">
        {uploadedFiles.length > 0 ? (
          <div className="space-y-2">
            {uploadedFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
                <FileText className="size-5 text-rose-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{f.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(f.size / 1024).toFixed(1)} KB · {f.chapters} 个章节
                  </p>
                </div>
                <button
                  onClick={onRemoveFiles}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  移除
                </button>
              </div>
            ))}
          </div>
        ) : (
          <Textarea
            placeholder={"将小说文本粘贴到这里...\n\n支持的章节格式：第一章、第一节、第一回、Chapter 1"}
            className="min-h-[180px] sm:min-h-[220px] resize-y text-sm border-0 bg-transparent focus-visible:ring-0 p-0 placeholder:text-muted-foreground/40"
            value={novelText}
            onChange={(e) => onTextChange(e.target.value)}
          />
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <input ref={fileInputRef} type="file" accept=".txt,.md,.docx" multiple onChange={handleFileUpload} className="hidden" />
        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-14 px-8 sm:px-10 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-base sm:text-lg font-semibold transition-colors shadow-lg shadow-rose-500/20 cursor-pointer min-w-[44px]"
          >
            <Upload className="size-5" />
            选择小说文件
          </button>
          <span className="text-xs text-muted-foreground">当前支持 .txt / .md / .docx 格式，可多选</span>
        </div>
        <button
          onClick={onParse}
          disabled={!novelText.trim() || isParsing}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-14 px-8 sm:px-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-base sm:text-lg font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer min-w-[44px]"
        >
          <FileText className="size-5" />
          {isParsing ? "解析中..." : "解析章节"}
        </button>
      </div>
    </div>
  );
}
