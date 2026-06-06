"use client";

import { useRef, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText } from "lucide-react";

interface NovelInputProps {
  value: string;
  onChange: (value: string) => void;
  onParse: () => void;
  isParsing: boolean;
}

export function NovelInput({ value, onChange, onParse, isParsing }: NovelInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".txt")) {
      alert("目前仅支持 .txt 文件");
      return;
    }

    const text = await file.text();
    onChange(text);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="novel-text">粘贴小说文本</Label>
        <Textarea
          id="novel-text"
          placeholder="将小说文本粘贴到这里...&#10;&#10;支持的章节格式：&#10;- 第一章 标题&#10;- 第一节 标题&#10;- 第一回 标题&#10;- Chapter 1 Title"
          className="min-h-[300px] resize-y font-mono text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
          >
            <Upload className="mr-2 size-4" />
            上传 .txt 文件
          </Button>
        </div>

        <Button
          onClick={onParse}
          disabled={!value.trim() || isParsing}
          className="flex-1"
        >
          <FileText className="mr-2 size-4" />
          {isParsing ? "解析中..." : "解析章节"}
        </Button>
      </div>
    </div>
  );
}
