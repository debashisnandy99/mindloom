import {
  currentRevision,
  updateProgress,
} from "../../models/toolGeneration.model.js";
import type {
  GenerationStatus,
  ToolGenerationEvent,
  ToolGenerationJobData,
} from "../../types/generation.js";
import { logBullMQFailure } from "../../utils/bullmq.logger.js";
import { childLogger } from "../../utils/logger.js";
import { publishToolEvent } from "../sse/sse.service.js";
import { clearTool } from "./regenerate.js";
import { generateTool } from "./tool-generation.service.js";

const log = childLogger("tool-gen-job");

function event(
  data: ToolGenerationJobData,
  status: GenerationStatus,
  progress: number,
  extra: { message?: string; error?: string } = {},
): ToolGenerationEvent {
  return {
    notebookId: data.notebookId,
    kind: data.kind,
    status,
    progress,
    at: new Date().toISOString(),
    ...extra,
  };
}

/**
 * Runs one tool generation job: persists status transitions, streams progress
 * over SSE, and bails out if a newer request has superseded this one so a stale
 * artifact never overwrites a fresh one.
 */
export async function processToolGenerationJob(
  data: ToolGenerationJobData,
): Promise<void> {
  const { notebookId, kind, revision } = data;
  const started = Date.now();

  const report = async (
    status: GenerationStatus,
    progress: number,
    message: string,
  ) => {
    await updateProgress(notebookId, kind, { status, progress, message });
    await publishToolEvent(event(data, status, progress, { message }));
  };

  try {
    // Superseded before we even started (a newer edit already enqueued).
    const latest = await currentRevision(notebookId, kind);
    if (revision < latest) {
      log.info({ notebookId, kind, revision, latest }, "job superseded, skipping");
      return;
    }

    await report("PROCESSING", 5, "Starting generation");

    const generated = await generateTool(notebookId, kind, async (progress, message) => {
      await report("PROCESSING", progress, message);
    });

    // Re-check: a source edit during the LLM call means this result is stale.
    if ((await currentRevision(notebookId, kind)) > revision) {
      log.info({ notebookId, kind }, "superseded during generation, discarding");
      return;
    }

    if (!generated) {
      // No indexed content left (e.g. the last source was deleted): drop any
      // stale artifact so the UI shows an empty state, not old data.
      await clearTool(notebookId, kind);
      await updateProgress(notebookId, kind, {
        status: "IDLE",
        progress: 0,
        message: "No sources to generate from",
      });
      await publishToolEvent(
        event(data, "IDLE", 0, { message: "No sources to generate from" }),
      );
      return;
    }

    const generatedMs = Date.now() - started;
    await updateProgress(notebookId, kind, {
      status: "READY",
      progress: 100,
      message: "Ready",
      generatedMs,
    });
    await publishToolEvent(event(data, "READY", 100, { message: "Ready" }));
    log.info({ notebookId, kind, generatedMs }, "tool generated");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    log.error({ err, notebookId, kind }, "tool generation failed");
    logBullMQFailure("BullMQ tool processor failed", err, { notebookId, kind, revision });
    const failureUpdates = await Promise.allSettled([
      updateProgress(notebookId, kind, {
        status: "FAILED",
        progress: 100,
        message: "Generation failed",
        errorMessage: message,
      }),
      publishToolEvent(event(data, "FAILED", 100, { error: message })),
    ]);
    for (const result of failureUpdates) {
      if (result.status === "rejected") {
        logBullMQFailure("Failed to persist or publish a BullMQ tool failure", result.reason, {
          notebookId,
          kind,
          revision,
        });
      }
    }
    throw err;
  }
}
