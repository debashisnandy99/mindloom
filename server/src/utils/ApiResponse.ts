import type { Response } from "express";

export interface SuccessBody<T> {
  success: true;
  data: T;
  message?: string;
  meta?: Record<string, unknown>;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  message?: string,
  meta?: Record<string, unknown>,
): Response {
  const body: SuccessBody<T> = { success: true, data };
  if (message) body.message = message;
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

export function sendCreated<T>(res: Response, data: T, message?: string) {
  return sendSuccess(res, data, 201, message);
}

export function sendAccepted<T>(res: Response, data: T, message?: string) {
  return sendSuccess(res, data, 202, message);
}

export function sendNoContent(res: Response) {
  return res.status(204).send();
}
