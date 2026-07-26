import { asyncHandler } from "../middlewares/asyncHandler.js";
import { listSources } from "../models/source.model.js";
import { listToolGenerations } from "../models/toolGeneration.model.js";
import { addSseClient } from "../services/sse/sse.service.js";

/**
 * Opens the notebook's event stream (indexing + tool generation). The initial
 * snapshot lets the client render correct state even if it connects after a job
 * finished — including any tool generation in progress.
 */
export const streamNotebookEvents = asyncHandler(async (req, res) => {
  const notebookId = req.notebook!.id;

  // No timeout: the stream is meant to stay open for the whole session.
  req.socket.setTimeout(0);
  req.socket.setNoDelay(true);
  req.socket.setKeepAlive(true);

  await addSseClient(notebookId, res);

  const [sources, tools] = await Promise.all([
    listSources(notebookId),
    listToolGenerations(notebookId),
  ]);

  res.write(
    `event: snapshot\ndata: ${JSON.stringify({
      notebookId,
      sources: sources.map((s) => ({
        sourceId: s.id,
        status: s.status,
        chunkCount: s.chunkCount,
        error: s.errorMessage,
      })),
      tools: tools.map((t) => ({
        kind: t.kind,
        status: t.status,
        progress: t.progress,
        message: t.message,
        error: t.errorMessage,
      })),
    })}\n\n`,
  );
});
