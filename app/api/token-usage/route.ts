import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end) {
    return Response.json({ success: false, error: "start and end parameters required" }, { status: 400 });
  }

  const apiKey = process.env.QINIU_AI_API_KEY;
  if (!apiKey) {
    return Response.json({ success: false, error: "QINIU_AI_API_KEY not configured" }, { status: 500 });
  }

  try {
    const url = `https://api.qnaigc.com/v2/stat/usage?granularity=day&start=${start}T00:00:00%2B08:00&end=${end}T23:59:59%2B08:00`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const data = await res.json();

    if (!data.status) {
      return Response.json({ success: false, error: data.error || "Failed to fetch usage" }, { status: 500 });
    }

    // Extract today's usage
    const today = new Date().toISOString().split("T")[0];
    let inputTokens = 0;
    let outputTokens = 0;

    if (data.data && data.data.length > 0) {
      for (const model of data.data) {
        for (const item of model.items) {
          for (const category of item.categories) {
            for (const value of category.values) {
              if (value.time === today || value.time?.startsWith(today)) {
                if (item.name.includes("输入")) {
                  inputTokens += value.value || 0;
                } else if (item.name.includes("输出")) {
                  outputTokens += value.value || 0;
                }
              }
            }
          }
        }
      }
    }

    return Response.json({
      success: true,
      data: {
        input: Math.round(inputTokens * 100) / 100,
        output: Math.round(outputTokens * 100) / 100,
        date: today,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
