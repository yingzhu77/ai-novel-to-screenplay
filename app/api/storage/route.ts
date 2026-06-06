import { uploadFile, getDownloadUrl } from "@/lib/qiniu";
import yaml from "js-yaml";

export async function POST(request: Request) {
  try {
    const { screenplay, format = "yaml" } = await request.json();

    if (!screenplay) {
      return Response.json(
        { success: false, error: "screenplay data is required" },
        { status: 400 }
      );
    }

    const title = screenplay.meta?.screenplay_title || "screenplay";
    const timestamp = Date.now();
    const key = `screenplays/${title}_${timestamp}.${format}`;

    let content: string;
    let contentType: string;

    if (format === "json") {
      content = JSON.stringify(screenplay, null, 2);
      contentType = "application/json";
    } else {
      content = yaml.dump(screenplay, { indent: 2, lineWidth: 120, noRefs: true });
      contentType = "text/yaml";
    }

    const uploadResult = await uploadFile(key, content, contentType);
    if (!uploadResult.success) {
      return Response.json(
        { success: false, error: uploadResult.error },
        { status: 500 }
      );
    }

    const urlResult = await getDownloadUrl(key, 3600);
    if (!urlResult.success) {
      return Response.json(
        { success: false, error: urlResult.error },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      data: { key, downloadUrl: urlResult.url },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
