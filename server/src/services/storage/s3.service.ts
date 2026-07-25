import { randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3_BUCKET, s3 } from "../../config/s3.js";
import { env } from "../../env.js";
import { childLogger } from "../../utils/logger.js";

const log = childLogger("s3");

export interface UploadResult {
  key: string;
  url: string;
  size: number;
}

function safeName(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}

export async function uploadPdfToS3(
  notebookId: string,
  file: Express.Multer.File,
): Promise<UploadResult> {
  const key = `notebooks/${notebookId}/sources/${randomUUID()}-${safeName(file.originalname)}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ContentDisposition: `inline; filename="${safeName(file.originalname)}"`,
    }),
  );

  log.debug({ key, size: file.size }, "uploaded pdf to s3");

  return {
    key,
    url: `https://${S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`,
    size: file.size,
  };
}

export async function downloadFromS3(key: string): Promise<Buffer> {
  const res = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
  if (!res.Body) throw new Error(`S3 object ${key} has no body`);
  return Buffer.from(await res.Body.transformToByteArray());
}

/** Time-limited read URL so the bucket itself can stay private. */
export function getPresignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }), {
    expiresIn: expiresInSeconds,
  });
}

export async function deleteFromS3(key: string): Promise<void> {
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
  } catch (err) {
    // A missing object should not block deleting the database row.
    log.warn({ err, key }, "failed to delete s3 object");
  }
}
