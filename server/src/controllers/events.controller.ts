import { asyncHandler } from "../middlewares/asyncHandler.js";
import { listSources } from "../models/source.model.js";
import { addSseClient } from "../services/sse/sse.service.js";

/**
 * Opens the notebook's indexing event stream. The initial snapshot lets the
 * client render correct state even if it connects after a job finished.
 */
export const streamNotebookEvents = asyncHandler(async (req, res) => {
  const notebookId = req.notebook!.id;

  // No timeout: the stream is meant to stay open for the whole session.
  req.socket.setTimeout(0);
  req.socket.setNoDelay(true);
  req.socket.setKeepAlive(true);

  await addSseClient(notebookId, res);

  const sources = await listSources(notebookId);
  res.write(
    `event: snapshot\ndata: ${JSON.stringify({
      notebookId,
      sources: sources.map((s) => ({
        sourceId: s.id,
        status: s.status,
        chunkCount: s.chunkCount,
        error: s.errorMessage,
      })),
    })}\n\n`,
  );
});
