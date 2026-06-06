"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Copy, Check } from "lucide-react";
import type { Screenplay } from "@/lib/schema";
import yaml from "js-yaml";

interface ScreenplayViewerProps {
  screenplay: Screenplay;
}

export function ScreenplayViewer({ screenplay }: ScreenplayViewerProps) {
  const [copied, setCopied] = useState(false);

  const yamlContent = yaml.dump(screenplay, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
  });

  const jsonContent = JSON.stringify(screenplay, null, 2);

  const handleDownload = (format: "yaml" | "json") => {
    const content = format === "yaml" ? yamlContent : jsonContent;
    const blob = new Blob([content], {
      type: format === "yaml" ? "text/yaml" : "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `screenplay.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">剧本输出</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleDownload("yaml")}>
            <Download className="mr-1 size-3" />
            YAML
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleDownload("json")}>
            <Download className="mr-1 size-3" />
            JSON
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="yaml">
          <TabsList>
            <TabsTrigger value="yaml">YAML</TabsTrigger>
            <TabsTrigger value="json">JSON</TabsTrigger>
            <TabsTrigger value="preview">预览</TabsTrigger>
          </TabsList>

          <TabsContent value="yaml" className="relative">
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-2 right-2"
              onClick={() => handleCopy(yamlContent)}
            >
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
            </Button>
            <pre className="mt-2 max-h-[500px] overflow-auto rounded-lg bg-muted p-4 text-sm font-mono">
              {yamlContent}
            </pre>
          </TabsContent>

          <TabsContent value="json" className="relative">
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-2 right-2"
              onClick={() => handleCopy(jsonContent)}
            >
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
            </Button>
            <pre className="mt-2 max-h-[500px] overflow-auto rounded-lg bg-muted p-4 text-sm font-mono">
              {jsonContent}
            </pre>
          </TabsContent>

          <TabsContent value="preview">
            <div className="mt-2 space-y-4 max-h-[500px] overflow-auto">
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold mb-2">元信息</h3>
                <dl className="grid grid-cols-2 gap-1 text-sm">
                  <dt className="text-muted-foreground">标题</dt>
                  <dd>{screenplay.meta.screenplay_title}</dd>
                  <dt className="text-muted-foreground">原著</dt>
                  <dd>{screenplay.meta.adaptation_of}</dd>
                  <dt className="text-muted-foreground">章节数</dt>
                  <dd>{screenplay.meta.chapters_included.length}</dd>
                </dl>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="font-semibold mb-2">
                  角色 ({screenplay.characters.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {screenplay.characters.map((char) => (
                    <span
                      key={char.id}
                      className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-sm"
                    >
                      {char.name}
                      <span className="ml-1 text-xs text-muted-foreground">
                        {char.role}
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              {screenplay.chapters.map((ch) => (
                <div key={ch.chapter_number} className="rounded-lg border p-4">
                  <h3 className="font-semibold mb-2">
                    {ch.chapter_title}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({ch.scene_count} 场景)
                    </span>
                  </h3>
                  {ch.scenes.map((scene) => (
                    <div
                      key={scene.scene_id}
                      className="ml-4 mb-3 border-l-2 border-muted pl-4"
                    >
                      <p className="text-sm font-medium text-muted-foreground">
                        {scene.scene_heading}
                      </p>
                      <p className="text-sm mt-1">{scene.action}</p>
                      {scene.dialogues.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {scene.dialogues.map((d) => (
                            <p key={d.index} className="text-sm">
                              <span className="font-semibold">{d.speaker}：</span>
                              {d.emotion && (
                                <span className="text-muted-foreground">
                                  （{d.emotion}）
                                </span>
                              )}
                              {d.text}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
