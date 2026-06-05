import { convertChapterToScreenplay } from "@/lib/llm";
import type { Character } from "@/lib/schema";

export const maxDuration = 60;

interface ConvertRequestBody {
  chapterNumber: number;
  chapterTitle: string;
  chapterContent: string;
  existingCharacters?: Character[];
}

export async function POST(request: Request) {
  try {
    const body: ConvertRequestBody = await request.json();

    if (!body.chapterContent?.trim()) {
      return Response.json(
        { success: false, error: "chapterContent is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
    const model = process.env.DEEPSEEK_MODEL || "deepseek/deepseek-v4-flash";

    if (!apiKey) {
      return Response.json(
        { success: false, error: "DEEPSEEK_API_KEY not configured" },
        { status: 500 }
      );
    }

    const result = await convertChapterToScreenplay(
      {
        number: body.chapterNumber,
        title: body.chapterTitle,
        content: body.chapterContent,
      },
      { apiKey, baseUrl, model },
      body.existingCharacters
    );

    if (!result.success) {
      console.error("LLM conversion failed:", result.error);
      return Response.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return Response.json({ success: true, data: result.data, characters: result.characters });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
