import type { RequestHandler } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { sendCreated, sendNoContent, sendSuccess } from "../../utils/ApiResponse.js";

/**
 * All seven tools are one artifact per notebook with an optional ordered
 * child collection, so their CRUD handlers are generated from one shape
 * rather than duplicated seven times.
 */
export interface ToolDefinition<TArtifact, TItem, TCreateItem> {
  /** Response key, e.g. `mindMap`. */
  key: string;
  /** Route param holding the child id, e.g. `nodeId`. */
  itemParam: string;
  /** Response key for a single child, e.g. `node`. */
  itemKey: string;

  get(notebookId: string): Promise<TArtifact | null>;
  upsert(notebookId: string, body: never): Promise<TArtifact>;
  remove(notebookId: string): Promise<unknown>;

  addItem?(artifactId: string, body: TCreateItem, order: number): Promise<TItem>;
  updateItem?(itemId: string, body: Partial<TCreateItem>): Promise<TItem>;
  removeItem?(itemId: string): Promise<unknown>;
  /** Used to confirm the child belongs to the caller's notebook. */
  findItem?(itemId: string): Promise<{ notebookId: string } | null>;
  countItems?(artifactId: string): Promise<number>;
}

export interface ToolHandlers {
  show: RequestHandler;
  upsert: RequestHandler;
  destroy: RequestHandler;
  addItem: RequestHandler;
  updateItem: RequestHandler;
  removeItem: RequestHandler;
}

export function createToolHandlers<TArtifact extends { id: string }, TItem, TCreateItem>(
  def: ToolDefinition<TArtifact, TItem, TCreateItem>,
): ToolHandlers {
  async function requireArtifact(notebookId: string): Promise<TArtifact> {
    const artifact = await def.get(notebookId);
    if (!artifact) throw ApiError.notFound(`No ${def.key} exists for this notebook`);
    return artifact;
  }

  /** Guards a child route by walking back up to the notebook. */
  async function assertItemInNotebook(itemId: string, notebookId: string): Promise<void> {
    if (!def.findItem) throw ApiError.notFound();
    const item = await def.findItem(itemId);
    if (!item) throw ApiError.notFound(`${def.itemKey} not found`);
    if (item.notebookId !== notebookId) throw ApiError.forbidden();
  }

  const notImplemented: RequestHandler = (_req, _res, next) => {
    next(ApiError.notFound(`${def.key} does not support item-level routes`));
  };

  return {
    show: asyncHandler(async (req, res) => {
      const artifact = await def.get(req.notebook!.id);
      sendSuccess(res, { [def.key]: artifact });
    }),

    upsert: asyncHandler(async (req, res) => {
      const existed = await def.get(req.notebook!.id);
      const artifact = await def.upsert(req.notebook!.id, req.body as never);
      const payload = { [def.key]: artifact };
      existed
        ? sendSuccess(res, payload, 200, `${def.key} updated`)
        : sendCreated(res, payload, `${def.key} created`);
    }),

    destroy: asyncHandler(async (req, res) => {
      await requireArtifact(req.notebook!.id);
      await def.remove(req.notebook!.id);
      sendNoContent(res);
    }),

    addItem: def.addItem
      ? asyncHandler(async (req, res) => {
          const artifact = await requireArtifact(req.notebook!.id);
          const order = def.countItems ? await def.countItems(artifact.id) : 0;
          const item = await def.addItem!(artifact.id, req.body as TCreateItem, order);
          sendCreated(res, { [def.itemKey]: item });
        })
      : notImplemented,

    updateItem: def.updateItem
      ? asyncHandler(async (req, res) => {
          const itemId = req.params[def.itemParam];
          await assertItemInNotebook(itemId, req.notebook!.id);
          const item = await def.updateItem!(itemId, req.body as Partial<TCreateItem>);
          sendSuccess(res, { [def.itemKey]: item });
        })
      : notImplemented,

    removeItem: def.removeItem
      ? asyncHandler(async (req, res) => {
          const itemId = req.params[def.itemParam];
          await assertItemInNotebook(itemId, req.notebook!.id);
          await def.removeItem!(itemId);
          sendNoContent(res);
        })
      : notImplemented,
  };
}
