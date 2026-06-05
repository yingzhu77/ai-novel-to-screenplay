import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getS3Client(): S3Client {
  const accessKeyId = process.env.QINIU_ACCESS_KEY;
  const secretAccessKey = process.env.QINIU_SECRET_KEY;
  const endpoint = process.env.QINIU_ENDPOINT;
  const region = process.env.QINIU_REGION;

  if (!accessKeyId || !secretAccessKey || !endpoint || !region) {
    throw new Error("Qiniu S3 credentials not configured in environment variables");
  }

  return new S3Client({
    region,
    endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function getBucket(): string {
  const bucket = process.env.QINIU_BUCKET;
  if (!bucket) throw new Error("QINIU_BUCKET not configured");
  return bucket;
}

/** Upload a file to Qiniu Kodo via S3 protocol */
export async function uploadFile(
  key: string,
  body: Buffer | string,
  contentType: string = "application/octet-stream"
): Promise<{ success: boolean; key?: string; error?: string }> {
  try {
    const client = getS3Client();
    const bucket = getBucket();

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );

    return { success: true, key };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Upload failed: ${message}` };
  }
}

/** Generate a signed download URL for a file */
export async function getDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const client = getS3Client();
    const bucket = getBucket();

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const url = await getSignedUrl(client, command, { expiresIn });
    return { success: true, url };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to generate URL: ${message}` };
  }
}

/** Download a file content from Qiniu Kodo */
export async function downloadFile(
  key: string
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const client = getS3Client();
    const bucket = getBucket();

    const result = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    const content = await result.Body?.transformToString();
    if (content === undefined) {
      return { success: false, error: "Empty file content" };
    }

    return { success: true, content };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Download failed: ${message}` };
  }
}

/** Delete a file from Qiniu Kodo */
export async function deleteFile(
  key: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getS3Client();
    const bucket = getBucket();

    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Delete failed: ${message}` };
  }
}

/** Check if a file exists */
export async function fileExists(
  key: string
): Promise<{ success: boolean; exists?: boolean; error?: string }> {
  try {
    const client = getS3Client();
    const bucket = getBucket();

    await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    return { success: true, exists: true };
  } catch (err: unknown) {
    const s3Err = err as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (s3Err.name === "NotFound" || s3Err.$metadata?.httpStatusCode === 404) {
      return { success: true, exists: false };
    }
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Check failed: ${message}` };
  }
}
