import { splitChapters } from "@/lib/splitter";

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text?.trim()) {
      return Response.json(
        { success: false, error: "text is required" },
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
