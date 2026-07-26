import { randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3_BUCKET, s3 } from "../../config/s3.js";
import { env } from "../../env.js";
import { ApiError } from "../../utils/ApiError.js";
import { logS3Failure, s3Logger } from "../../utils/s3.logger.js";

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

  s3Logger.info("s3 upload starting", {
    operation: "PutObject",
    notebookId,
    key,
    bucket: S3_BUCKET,
    region: env.AWS_REGION,
    size: file.size,
    mimeType: file.mimetype,
    originalName: file.originalname,
    bufferBytes: file.buffer?.byteLength ?? 0,
  });

  if (!file.buffer?.byteLength) {
    const err = ApiError.badRequest("PDF upload is empty — nothing to store in S3");
    logS3Failure("s3 upload rejected: empty buffer", err, {
      operation: "PutObject",
      notebookId,
      key,
      bucket: S3_BUCKET,
    });
    throw err;
  }

  try {
    const result = await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype || "application/pdf",
        ContentDisposition: `inline; filename="${safeName(file.originalname)}"`,
      }),
    );

    s3Logger.info("s3 upload succeeded", {
      operation: "PutObject",
      notebookId,
      key,
      bucket: S3_BUCKET,
      size: file.size,
      etag: result.ETag,
      requestId: result.$metadata.requestId,
      httpStatusCode: result.$metadata.httpStatusCode,
    });

    return {
      key,
      url: `https://${S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`,
      size: file.size,
    };
  } catch (error) {
    logS3Failure("s3 upload failed", error, {
      operation: "PutObject",
      notebookId,
      key,
      bucket: S3_BUCKET,
      region: env.AWS_REGION,
      size: file.size,
      mimeType: file.mimetype,
      // Never log the secret — only whether a key id is present.
      hasAccessKeyId: Boolean(env.AWS_ACCESS_KEY_ID && env.AWS_ACCESS_KEY_ID !== "changeme"),
    });

    throw ApiError.internal(
      "Failed to upload PDF to S3. Check server/logs/s3-error.log for details.",
    );
  }
}

export async function downloadFromS3(key: string): Promise<Buffer> {
  s3Logger.debug("s3 download starting", {
    operation: "GetObject",
    key,
    bucket: S3_BUCKET,
  });

  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    if (!res.Body) throw new Error(`S3 object ${key} has no body`);

    const buffer = Buffer.from(await res.Body.transformToByteArray());
    s3Logger.info("s3 download succeeded", {
      operation: "GetObject",
      key,
      bucket: S3_BUCKET,
      bytes: buffer.byteLength,
      requestId: res.$metadata.requestId,
    });
    return buffer;
  } catch (error) {
    logS3Failure("s3 download failed", error, {
      operation: "GetObject",
      key,
      bucket: S3_BUCKET,
      region: env.AWS_REGION,
    });
    throw error;
  }
}

/** Time-limited read URL so the bucket itself can stay private. */
export async function getPresignedUrl(
  key: string,
  expiresInSeconds = 3600,
): Promise<string> {
  try {
    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }),
      { expiresIn: expiresInSeconds },
    );
    s3Logger.debug("s3 presign succeeded", {
      operation: "GetObjectPresign",
      key,
      bucket: S3_BUCKET,
      expiresInSeconds,
    });
    return url;
  } catch (error) {
    logS3Failure("s3 presign failed", error, {
      operation: "GetObjectPresign",
      key,
      bucket: S3_BUCKET,
    });
    throw error;
  }
}

export async function deleteFromS3(key: string): Promise<void> {
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    s3Logger.info("s3 delete succeeded", {
      operation: "DeleteObject",
      key,
      bucket: S3_BUCKET,
    });
  } catch (error) {
    // A missing object should not block deleting the database row.
    logS3Failure("s3 delete failed (non-fatal)", error, {
      operation: "DeleteObject",
      key,
      bucket: S3_BUCKET,
    });
  }
}
