import { splitChapters } from "@/lib/splitter";

export async function POST(request: Request) {
  try {
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
      return Response.json(
        { success: false, error: "Text too large (max 5MB)" },
        { status: 413 }
      );
    }

    const { text } = await request.json();

    if (typeof text !== "string" || !text.trim()) {
      return Response.json(
        { success: false, error: "text is required and must be a string" },
        { status: 400 }
      );
    }

    const chapters = splitChapters(text);

    if (chapters.length === 0) {
      return Response.json(
        { success: false, error: "No chapters found in the text" },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      data: {
        title: "Novel",
        chapters: chapters.map((c) => ({
          number: c.number,
          title: c.title,
          content: c.content,
        })),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
