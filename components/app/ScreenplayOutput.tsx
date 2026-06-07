"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Copy, Check, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import type { Screenplay } from "@/lib/schema";
import type { ChapterItem } from "@/types/app";
import yaml from "js-yaml";

interface ScreenplayOutputProps {
  screenplay: Screenplay;
  chapters: ChapterItem[];
  isSaving: boolean;
  cloudUrl: string | null;
  cloudConsent: boolean;
  onCloudConsentChange: (checked: boolean) => void;
  onCloudSave: () => void;
}

export function ScreenplayOutput({
  screenplay,
  chapters,
  isSaving,
  cloudUrl,
  cloudConsent,
  onCloudConsentChange,
  onCloudSave,
}: ScreenplayOutputProps) {
  const [copied, setCopied] = useState(false);

  const handleDownload = (format: "yaml" | "json") => {
    const content = format === "yaml"
      ? yaml.dump(screenplay, { indent: 2, lineWidth: 120, noRefs: true })
      : JSON.stringify(screenplay, null, 2);
    const blob = new Blob([content], { type: format === "yaml" ? "text/yaml" : "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `screenplay.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-secure contexts
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const roleColors: Record<string, string> = { "主角": "#f43f5e", "反派": "#8b5cf6", "配角": "#6b7280" };

  return (
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

        {/* Cloud Save Section */}
        <div className="px-4 pb-3 border-b border-border mb-3">
          {cloudUrl ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-green-600 dark:text-green-400">已保存到云端</span>
              <a href={cloudUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate max-w-[300px]">云端下载链接</a>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="cloud-consent"
                  checked={cloudConsent}
                  onCheckedChange={(checked) => onCloudConsentChange(checked === true)}
                  className="mt-0.5 h-4 w-4"
                />
                <label htmlFor="cloud-consent" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                  我已了解并同意：保存到云端意味着我的内容将存储在<strong className="text-foreground">共享存储桶</strong>中，
                  虽然有签名 URL 保护，但<strong className="text-amber-600 dark:text-amber-400">仍存在数据泄露风险</strong>。
                  建议仅保存非敏感内容。<br/>
                  <span className="text-muted-foreground/70">
                    提示：不保存到云端，当前页面仍可下载 YAML/JSON 文件；但返回后历史记录将无法下载。保存到云端后可随时从历史记录下载。
                  </span>
                </label>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onCloudSave}
                disabled={!cloudConsent || isSaving}
                className="text-xs h-8"
              >
                {isSaving ? <Loader2 className="mr-1 size-3 animate-spin" /> : null}
                保存到云端获取下载链接
              </Button>
            </div>
          )}
        </div>

        <CardContent>
          <Tabs defaultValue="preview">
            <TabsList className="h-9">
              <TabsTrigger value="preview" className="text-xs">预览</TabsTrigger>
              <TabsTrigger value="relations" className="text-xs">关系</TabsTrigger>
              <TabsTrigger value="compare" className="text-xs">对比</TabsTrigger>
              <TabsTrigger value="yaml" className="text-xs">YAML</TabsTrigger>
              <TabsTrigger value="json" className="text-xs">JSON</TabsTrigger>
            </TabsList>

            {/* Preview Tab */}
            <TabsContent value="preview" className="mt-3">
              <div className="space-y-3 max-h-[400px] overflow-auto">
                <div className="rounded-lg bg-muted/50 p-3">
                  <h3 className="font-semibold text-sm mb-2">角色 ({screenplay.characters.length})</h3>
                  <div className="space-y-2">
                    {screenplay.characters.map((c, i) => (
                      <div key={`${c.id}-${i}`} className="flex items-start gap-2 bg-card rounded-lg border border-border p-2">
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

            {/* Relations Tab */}
            <TabsContent value="relations" className="mt-3">
              <div className="rounded-lg bg-muted/50 p-4">
                {screenplay.characters.length < 2 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">至少需要 2 个角色才能生成关系图</p>
                ) : (() => {
                  const edges: { from: string; to: string; weight: number }[] = [];
                  const edgeMap = new Map<string, number>();
                  for (const ch of screenplay.chapters) {
                    for (const scene of ch.scenes) {
                      const chars = scene.characters_present;
                      for (let a = 0; a < chars.length; a++) {
                        for (let b = a + 1; b < chars.length; b++) {
                          const key = [chars[a], chars[b]].sort().join("|||");
                          edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
                        }
                      }
                    }
                  }
                  edgeMap.forEach((weight, key) => {
                    const [from, to] = key.split("|||");
                    edges.push({ from, to, weight });
                  });

                  const n = screenplay.characters.length;
                  const cx = 200, cy = 150, r = 100;
                  const positions = new Map<string, { x: number; y: number }>();
                  screenplay.characters.forEach((c, i) => {
                    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
                    positions.set(c.name, { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
                  });

                  return (
                    <svg viewBox="0 0 400 300" className="w-full max-w-md mx-auto">
                      {edges.map((e) => {
                        const p1 = positions.get(e.from);
                        const p2 = positions.get(e.to);
                        if (!p1 || !p2) return null;
                        return (
                          <line key={e.from + e.to} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                            stroke="currentColor" strokeOpacity={0.2} strokeWidth={Math.min(e.weight * 1.5, 4)} />
                        );
                      })}
                      {screenplay.characters.map((c, i) => {
                        const pos = positions.get(c.name);
                        if (!pos) return null;
                        const color = roleColors[c.role] || "#6b7280";
                        return (
                          <g key={`${c.id}-${i}`}>
                            <circle cx={pos.x} cy={pos.y} r={18} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={1.5} />
                            <text x={pos.x} y={pos.y + 1} textAnchor="middle" dominantBaseline="middle"
                              className="fill-foreground text-[10px] font-medium">{c.name}</text>
                            <text x={pos.x} y={pos.y + 12} textAnchor="middle"
                              className="fill-muted-foreground text-[7px]">{c.role}</text>
                          </g>
                        );
                      })}
                    </svg>
                  );
                })()}
                {screenplay.characters.length >= 2 && (
                  <div className="flex justify-center gap-4 mt-3">
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="w-2.5 h-2.5 rounded-full bg-rose-500/30 border border-rose-500" />主角</span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="w-2.5 h-2.5 rounded-full bg-purple-500/30 border border-purple-500" />反派</span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="w-2.5 h-2.5 rounded-full bg-gray-500/30 border border-gray-500" />配角</span>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Compare Tab */}
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

            {/* YAML Tab */}
            <TabsContent value="yaml" className="mt-3 relative">
              <Button variant="ghost" size="icon-sm" className="absolute top-2 right-2 h-9 w-9" onClick={() => handleCopy(yaml.dump(screenplay, { indent: 2, lineWidth: 120, noRefs: true }))}>
                {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              </Button>
              <pre className="max-h-[400px] overflow-auto rounded-lg bg-muted p-3 text-xs font-mono">{yaml.dump(screenplay, { indent: 2, lineWidth: 120, noRefs: true })}</pre>
            </TabsContent>

            {/* JSON Tab */}
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
  );
}
