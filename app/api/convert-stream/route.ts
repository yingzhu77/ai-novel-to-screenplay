import { convertChapterToScreenplay } from "@/lib/llm";
import type { Character, ChapterScreenplay } from "@/lib/schema";

export const maxDuration = 300; // 5 minutes for long chapters

interface ChapterInput {
  number: number;
  title: string;
  content: string;
}

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request) {
  const { chapters, existingCharacters = [] } = await request.json();

  if (!Array.isArray(chapters) || chapters.length === 0) {
    return Response.json({ success: false, error: "chapters array is required" }, { status: 400 });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const model = process.env.DEEPSEEK_MODEL || "deepseek/deepseek-v4-flash";

  if (!apiKey) {
    return Response.json({ success: false, error: "DEEPSEEK_API_KEY not configured" }, { status: 500 });
  }

  const config = { apiKey, baseUrl, model };

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(new TextEncoder().encode(sseEvent(event, data)));
      };

      try {
        send("start", { total: chapters.length });

        const allScenes: ChapterScreenplay[] = [];
        const allCharacters: Character[] = [...existingCharacters];

        for (let i = 0; i < chapters.length; i++) {
          const chapter: ChapterInput = chapters[i];
          send("chapter-start", { index: i, number: chapter.number, title: chapter.title });

          // Rate limit: wait between requests to avoid 429 errors
          if (i > 0) {
            await new Promise((r) => setTimeout(r, 2000)); // 2 second delay between chapters
          }

          let lastError = "";
          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              const result = await convertChapterToScreenplay(
                { number: chapter.number, title: chapter.title, content: chapter.content },
                config,
                allCharacters
              );

              if (!result.success) {
                lastError = result.error || "Unknown error";
                // If rate limit error, wait longer before retry
                const isRateLimit = lastError.includes("429") || lastError.includes("rate limit");
                if (attempt === 0) { await new Promise((r) => setTimeout(r, isRateLimit ? 5000 : 1000)); continue; }
                break;
              }

              allScenes.push(result.data!);
              if (result.characters) {
                for (const char of result.characters) {
                  if (!allCharacters.some((c) => c.name === char.name)) {
                    allCharacters.push(char);
                  }
                }
              }

              send("chapter-done", {
                index: i,
                number: chapter.number,
                data: result.data,
                characters: result.characters || [],
              });
              lastError = "";
              break;
            } catch (err) {
              lastError = err instanceof Error ? err.message : "Unknown error";
              if (attempt === 0) { await new Promise((r) => setTimeout(r, 1000)); continue; }
            }
          }

          if (lastError) {
            send("chapter-error", { index: i, number: chapter.number, error: lastError });
          }
        }

        send("done", { scenes: allScenes, characters: allCharacters });
      } catch (err) {
        send("fatal-error", { error: err instanceof Error ? err.message : "Unknown error" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
