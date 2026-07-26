import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  createSource,
  deleteSource,
  getSource,
  listSources,
} from "../models/source.model.js";
import { prisma } from "../config/prisma.js";
import { regenerateNotebookTools } from "../services/generation/regenerate.js";
import { enqueueIndexingJob, removeIndexingJob } from "../services/indexing/queue.js";
import { tryDeleteSourceVectors } from "../services/indexing/vectorStore.js";
import { deleteFromS3, getPresignedUrl, uploadPdfToS3 } from "../services/storage/s3.service.js";
import { ApiError } from "../utils/ApiError.js";
import { sendAccepted, sendNoContent, sendSuccess } from "../utils/ApiResponse.js";
import type { CreateSourceBody } from "../validators/source.schema.js";

const DEFAULT_META: Record<CreateSourceBody["type"] | "PDF", string> = {
  PDF: "PDF · queued",
  URL: "Web page",
  YT: "YouTube video",
  GDOC: "Google Doc",
  TEXT: "Pasted text",
};

export const index = asyncHandler(async (req, res) => {
  const sources = await listSources(req.notebook!.id);
  sendSuccess(res, { sources });
});

export const show = asyncHandler(async (req, res) => {
  const source = await getSource(req.params.sourceId);
  if (!source) throw ApiError.notFound("Source not found");

  // Presign on read so the bucket itself can stay private.
  const downloadUrl = source.s3Key ? await getPresignedUrl(source.s3Key) : null;
  sendSuccess(res, { source, downloadUrl });
});

/**
 * Accepts a source, persists it as PENDING, hands the heavy work to the
 * indexing queue and returns immediately. The client tracks completion over
 * the notebook's SSE stream.
 */
export const create = asyncHandler(async (req, res) => {
  const notebookId = req.notebook!.id;
  const isUpload = Boolean(req.file);

  let source: Awaited<ReturnType<typeof createSource>>;

  if (isUpload) {
    const file = req.file!;
    const name = (req.body?.name as string)?.trim() || file.originalname;
    const { key, url, size } = await uploadPdfToS3(notebookId, file);

    source = await createSource({
      notebookId,
      name,
      type: "PDF",
      // The S3 object URL lives in `content`, matching link-type sources.
      content: url,
      meta: DEFAULT_META.PDF,
      s3Key: key,
      mimeType: file.mimetype,
      fileSize: size,
    });
  } else {
    const body = req.body as CreateSourceBody;
    source = await createSource({
      notebookId,
      name: body.name?.trim() || deriveName(body),
      type: body.type,
      content: body.content,
      meta: DEFAULT_META[body.type],
    });
  }

  await enqueueIndexingJob({ sourceId: source.id, notebookId, userId: req.user!.id });

  sendAccepted(res, { source }, "Source queued for indexing");
});

export const reindex = asyncHandler(async (req, res) => {
  const { sourceId } = req.params;
  const source = await getSource(sourceId);
  if (!source) throw ApiError.notFound("Source not found");
  if (source.status === "PROCESSING") {
    throw ApiError.conflict("This source is already being indexed");
  }

  await removeIndexingJob(sourceId);
  await prisma.source.update({
    where: { id: sourceId },
    data: { status: "PENDING", errorMessage: null, chunkCount: null, indexedAt: null },
  });
  await enqueueIndexingJob({
    sourceId,
    notebookId: source.notebookId,
    userId: req.user!.id,
  });

  sendAccepted(res, { sourceId }, "Source queued for re-indexing");
});

export const destroy = asyncHandler(async (req, res) => {
  const { sourceId } = req.params;
  const source = await getSource(sourceId);
  if (!source) throw ApiError.notFound("Source not found");

  await removeIndexingJob(sourceId);
  await tryDeleteSourceVectors(source.notebookId, sourceId);
  if (source.s3Key) await deleteFromS3(source.s3Key);
  await deleteSource(sourceId);

  // The notebook's content changed, so its study tools are now stale.
  await regenerateNotebookTools(source.notebookId, req.user!.id).catch(() => undefined);

  sendNoContent(res);
});

function deriveName(body: CreateSourceBody): string {
  if (body.type === "TEXT") {
    const firstLine = body.content.split("\n")[0].trim();
    return firstLine.length > 60 ? `${firstLine.slice(0, 60)}…` : firstLine || "Pasted text";
  }
  try {
    const url = new URL(body.content);
    return `${url.hostname}${url.pathname}`.replace(/\/$/, "");
  } catch {
    return body.content.slice(0, 60);
  }
}
