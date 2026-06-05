"use client";

import { useState, useCallback, useRef, useEffect, type ChangeEvent } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, FileText, Play, Loader2, CheckCircle2, AlertCircle, Download, Copy, Check, Sparkles, Sun, Moon } from "lucide-react";
import type { Screenplay, Character, ChapterScreenplay } from "@/lib/schema";
import yaml from "js-yaml";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ChapterItem {
  number: number;
  title: string;
  content: string;
  status: "pending" | "converting" | "done" | "error";
  error?: string;
}

interface HistoryItem {
  id: string;
  title: string;
  chapterCount: number;
  characterCount: number;
  cloudUrl: string | null;
  createdAt: string;
}

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
  const [copied, setCopied] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [cloudUrl, setCloudUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [convertProgress, setConvertProgress] = useState({ current: 0, total: 0, chapterTitle: "" });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [viewMode, setViewMode] = useState<"input" | "result">("input");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();

  // Load history on mount
  useEffect(() => { setHistory(loadHistory()); }, []);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "txt" && ext !== "md") { alert("目前仅支持 .txt 和 .md 文件"); return; }
    const text = await file.text();
    setNovelText(text);
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
      // Warn about long chapters (threshold: ~3000 tokens ≈ 6000 chars)
      const longChapters = parsed.filter((c) => c.content.length > 6000);
      if (longChapters.length > 0) {
        setWarnings(longChapters.map((c) => `${c.title} 内容较长（${c.content.length} 字），可能影响转换质量`));
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
    const allScenes: ChapterScreenplay[] = [];
    const allCharacters: Character[] = [];

    for (let i = 0; i < toConvert.length; i++) {
      const chapter = toConvert[i];
      setChapters((prev) => prev.map((c) => c.number === chapter.number ? { ...c, status: "converting" as const } : c));

      let lastError = "";
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch("/api/convert", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chapterNumber: chapter.number, chapterTitle: chapter.title, chapterContent: chapter.content, existingCharacters: allCharacters }),
          });
          const data = await res.json();
          if (!data.success) {
            lastError = data.error;
            if (attempt === 0) { await new Promise((r) => setTimeout(r, 1000)); continue; }
            break;
          }
          allScenes.push(data.data as ChapterScreenplay);
          if (Array.isArray(data.characters)) {
            for (const char of data.characters) {
              if (!allCharacters.some((c) => c.name === char.name)) {
                allCharacters.push(char);
              }
            }
          }
          setChapters((prev) => prev.map((c) => c.number === chapter.number ? { ...c, status: "done" as const } : c));
          setConvertProgress({ current: i + 1, total: toConvert.length, chapterTitle: chapter.title });
          lastError = "";
          break;
        } catch (err) {
          lastError = err instanceof Error ? err.message : "未知错误";
          if (attempt === 0) { await new Promise((r) => setTimeout(r, 1000)); continue; }
        }
      }
      if (lastError) {
        setChapters((prev) => prev.map((c) => c.number === chapter.number ? { ...c, status: "error" as const, error: lastError } : c));
      }
    }
    if (allScenes.length > 0) {
      const finalScreenplay: Screenplay = {
        meta: { screenplay_title: "AI Screenplay", adaptation_of: "Novel", author: "AI", draft_version: "1.0", chapters_included: allScenes.map((s) => s.chapter_number), generated_at: new Date().toISOString() },
        characters: allCharacters,
        chapters: allScenes,
      };
      setScreenplay(finalScreenplay);

      // Auto-save to Qiniu Kodo
      setIsSaving(true);
      setCloudUrl(null);
      try {
        const storageRes = await fetch("/api/storage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ screenplay: finalScreenplay, format: "yaml" }),
        });
        const storageData = await storageRes.json();
        if (storageData.success && storageData.data?.downloadUrl) {
          setCloudUrl(storageData.data.downloadUrl);
          const historyItem: HistoryItem = {
            id: `${Date.now()}`,
            title: finalScreenplay.meta.screenplay_title,
            chapterCount: finalScreenplay.chapters.length,
            characterCount: finalScreenplay.characters.length,
            cloudUrl: storageData.data.downloadUrl,
            createdAt: new Date().toISOString(),
          };
          saveHistory(historyItem);
          setHistory(loadHistory());
        }
      } catch {
        // Storage failure is non-blocking
      } finally {
        setIsSaving(false);
      }
    }
    setIsConverting(false);
    setConvertProgress({ current: 0, total: 0, chapterTitle: "" });
  }, [chapters, selectedChapters]);

  const handleDownload = (format: "yaml" | "json") => {
    if (!screenplay) return;
    const content = format === "yaml" ? yaml.dump(screenplay, { indent: 2, lineWidth: 120, noRefs: true }) : JSON.stringify(screenplay, null, 2);
    const blob = new Blob([content], { type: format === "yaml" ? "text/yaml" : "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `screenplay.${format}`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const doneCount = chapters.filter((c) => c.status === "done").length;
  const convertingCount = chapters.filter((c) => c.status === "converting").length;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Nav */}
      <nav className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-rose-500" />
            <span className="font-bold text-lg">AI Screenwriter</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:inline">从小说到剧本，一键转换</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="切换深色模式"
              className="h-11 w-11"
            >
              <Sun className="size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero / Input Section */}
      <main className="flex-1">
        {viewMode === "input" ? (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-8 sm:pb-12 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">小说转剧本</h1>
          <p className="text-base sm:text-lg text-muted-foreground mb-8 sm:mb-10">粘贴小说文本，AI 自动转换为结构化剧本，简单又快速！</p>

          {/* Textarea */}
          <div className="bg-card rounded-2xl shadow-sm border border-border p-4 sm:p-6 mb-6">
            <Textarea
              placeholder={"将小说文本粘贴到这里...\n\n支持的章节格式：第一章、第一节、第一回、Chapter 1"}
              className="min-h-[180px] sm:min-h-[220px] resize-y text-sm border-0 bg-transparent focus-visible:ring-0 p-0 placeholder:text-muted-foreground/40"
              value={novelText}
              onChange={(e) => setNovelText(e.target.value)}
            />
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <input ref={fileInputRef} type="file" accept=".txt,.md" onChange={handleFileUpload} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-12 sm:h-14 px-8 sm:px-10 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-base sm:text-lg font-semibold transition-colors shadow-lg shadow-rose-500/20 cursor-pointer min-w-[44px]"
            >
              <Upload className="size-5" />
              选择小说文件
            </button>
            <button
              onClick={handleParse}
              disabled={!novelText.trim() || isParsing}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-12 sm:h-14 px-8 sm:px-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-base sm:text-lg font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer min-w-[44px]"
            >
              <FileText className="size-5" />
              {isParsing ? "解析中..." : "解析章节"}
            </button>
          </div>
          <p className="text-sm text-muted-foreground/60 mt-4">或者把 .txt / .md 文件拖动到这里</p>
        </div>
        ) : (
        /* Result View */
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-8">
          <button
            onClick={() => { setViewMode("input"); setChapters([]); setScreenplay(null); setCloudUrl(null); setWarnings([]); setConvertProgress({ current: 0, total: 0, chapterTitle: "" }); }}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            ← 返回上传
          </button>
        </div>
        )}

        {/* Conversion Progress - only in result mode */}
        {viewMode === "result" && convertProgress.total > 0 && (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-6">
            <div className="rounded-xl bg-card border border-border p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin text-rose-500" />
                  <span className="text-sm font-medium">
                    正在转换 {convertProgress.current}/{convertProgress.total} 章
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {Math.round((convertProgress.current / convertProgress.total) * 100)}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(convertProgress.current / convertProgress.total) * 100}%` }}
                />
              </div>
              {convertProgress.chapterTitle && (
                <p className="text-xs text-muted-foreground mt-2 truncate">
                  {convertProgress.chapterTitle}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Chapter List */}
        {viewMode === "result" && chapters.length > 0 && (
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
                  <Button variant="ghost" size="sm" onClick={handleToggleAll} className="text-xs h-9">
                    {selectedChapters.size === chapters.length ? "取消全选" : "全选"}
                  </Button>
                  <Button onClick={handleConvert} disabled={selectedChapters.size === 0 || isConverting} size="sm" className="bg-rose-500 hover:bg-rose-600 text-white h-9">
                    {isConverting ? <Loader2 className="mr-1 size-3 animate-spin" /> : <Play className="mr-1 size-3" />}
                    转换 ({selectedChapters.size})
                  </Button>
                </div>
              </CardHeader>
              {warnings.length > 0 && (
                <div className="px-4 pb-3">
                  {warnings.map((w) => (
                    <p key={w} className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-md px-3 py-1.5">{w}</p>
                  ))}
                </div>
              )}
              <CardContent>
                <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
                  {chapters.map((chapter) => (
                    <div key={chapter.number} className="flex items-center gap-2.5 rounded-lg border border-border p-2.5 hover:bg-accent/50 transition-colors">
                      <Checkbox checked={selectedChapters.has(chapter.number)} onCheckedChange={() => handleToggleChapter(chapter.number)} disabled={chapter.status === "converting"} className="h-5 w-5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{chapter.title}</span>
                          {chapter.status === "pending" && <Badge variant="outline" className="text-[10px] px-1.5">待转换</Badge>}
                          {chapter.status === "converting" && <Badge variant="secondary" className="text-[10px] px-1.5"><Loader2 className="mr-0.5 size-2 animate-spin" />转换中</Badge>}
                          {chapter.status === "done" && <Badge className="text-[10px] px-1.5 bg-green-500"><CheckCircle2 className="mr-0.5 size-2" />完成</Badge>}
                          {chapter.status === "error" && <Badge variant="destructive" className="text-[10px] px-1.5"><AlertCircle className="mr-0.5 size-2" />失败</Badge>}
                        </div>
                      </div>
                      {chapter.status === "error" && chapter.error && <p className="text-[10px] text-destructive max-w-[160px] truncate">{chapter.error}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Screenplay Output */}
        {viewMode === "result" && screenplay && (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
            <Card className="border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base">剧本输出</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleDownload("yaml")} className="text-xs h-9">
                    <Download className="mr-1 size-3" />YAML
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDownload("json")} className="text-xs h-9">
                    <Download className="mr-1 size-3" />JSON
                  </Button>
                </div>
              </CardHeader>
              {(isSaving || cloudUrl) && (
                <div className="px-4 pb-3">
                  {isSaving && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Loader2 className="size-3 animate-spin" /> 正在保存到七牛云...
                    </p>
                  )}
                  {cloudUrl && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-green-600 dark:text-green-400">已保存到云端</span>
                      <a href={cloudUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate max-w-[300px]">云端下载链接</a>
                    </div>
                  )}
                </div>
              )}
              <CardContent>
                <Tabs defaultValue="preview">
                  <TabsList className="h-9">
                    <TabsTrigger value="preview" className="text-xs">预览</TabsTrigger>
                    <TabsTrigger value="compare" className="text-xs">对比</TabsTrigger>
                    <TabsTrigger value="yaml" className="text-xs">YAML</TabsTrigger>
                    <TabsTrigger value="json" className="text-xs">JSON</TabsTrigger>
                  </TabsList>
                  <TabsContent value="preview" className="mt-3">
                    <div className="space-y-3 max-h-[400px] overflow-auto">
                      <div className="rounded-lg bg-muted/50 p-3">
                        <h3 className="font-semibold text-sm mb-2">角色 ({screenplay.characters.length})</h3>
                        <div className="space-y-2">
                          {screenplay.characters.map((c) => (
                            <div key={c.id} className="flex items-start gap-2 bg-card rounded-lg border border-border p-2">
                              <span className="inline-flex items-center rounded-full bg-rose-500/10 text-rose-500 dark:bg-rose-500/20 px-2 py-0.5 text-xs font-medium shrink-0">{c.role}</span>
                              <div className="min-w-0">
                                <span className="font-medium text-sm">{c.name}</span>
                                {c.description && <span className="text-xs text-muted-foreground ml-2">{c.description}</span>}
                                {c.traits.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-0.5">
                                    {c.traits.map((t) => <span key={t} className="text-[10px] text-muted-foreground bg-muted rounded px-1">{t}</span>)}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {screenplay.characters.length === 0 && <span className="text-xs text-muted-foreground">暂无角色</span>}
                        </div>
                      </div>
                      {screenplay.chapters.map((ch) => (
                        <div key={ch.chapter_number} className="rounded-lg bg-muted/50 p-3">
                          <h3 className="font-semibold text-sm mb-2">{ch.chapter_title}</h3>
                          {ch.scenes.map((scene) => (
                            <div key={scene.scene_id} className="ml-3 mb-2 border-l-2 border-border pl-3">
                              <p className="text-xs text-muted-foreground">{scene.scene_heading}</p>
                              <p className="text-sm mt-0.5">{scene.action}</p>
                              {scene.dialogues.map((d) => (
                                <p key={d.index} className="text-sm mt-0.5"><span className="font-semibold">{d.speaker}：</span>{d.emotion && <span className="text-muted-foreground">（{d.emotion}）</span>}{d.text}</p>
                              ))}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  <TabsContent value="compare" className="mt-3">
                    <div className="space-y-4 max-h-[500px] overflow-auto">
                      {screenplay.chapters.map((ch) => {
                        const original = chapters.find((c) => c.number === ch.chapter_number);
                        return (
                          <div key={ch.chapter_number} className="rounded-lg border border-border overflow-hidden">
                            <div className="bg-muted/50 px-3 py-2 font-medium text-sm border-b border-border">{ch.chapter_title}</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                              <div className="p-3">
                                <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">原文</p>
                                <p className="text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">{original?.content || "无原文"}</p>
                              </div>
                              <div className="p-3">
                                <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">剧本</p>
                                <div className="space-y-2">
                                  {ch.scenes.map((scene) => (
                                    <div key={scene.scene_id}>
                                      <p className="text-[10px] text-rose-500 dark:text-rose-400 font-medium">{scene.scene_heading}</p>
                                      <p className="text-xs mt-0.5">{scene.action}</p>
                                      {scene.dialogues.map((d) => (
                                        <p key={d.index} className="text-xs mt-0.5"><span className="font-semibold">{d.speaker}：</span>{d.text}</p>
                                      ))}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </TabsContent>
                  <TabsContent value="yaml" className="mt-3 relative">
                    <Button variant="ghost" size="icon-sm" className="absolute top-2 right-2 h-9 w-9" onClick={() => handleCopy(yaml.dump(screenplay, { indent: 2, lineWidth: 120, noRefs: true }))}>
                      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                    </Button>
                    <pre className="max-h-[400px] overflow-auto rounded-lg bg-muted p-3 text-xs font-mono">{yaml.dump(screenplay, { indent: 2, lineWidth: 120, noRefs: true })}</pre>
                  </TabsContent>
                  <TabsContent value="json" className="mt-3 relative">
                    <Button variant="ghost" size="icon-sm" className="absolute top-2 right-2 h-9 w-9" onClick={() => handleCopy(JSON.stringify(screenplay, null, 2))}>
                      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                    </Button>
                    <pre className="max-h-[400px] overflow-auto rounded-lg bg-muted p-3 text-xs font-mono">{JSON.stringify(screenplay, null, 2)}</pre>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* History */}
      {viewMode === "input" && history.length > 0 && !screenplay && (
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
      )}

      {/* Footer */}
      <footer className="border-t border-border bg-card py-4">
        <div className="text-center text-xs text-muted-foreground">
          AI Screenwriter 2026 · Powered by DeepSeek V4 Flash & Qiniu Cloud
        </div>
      </footer>
    </div>
  );
}
