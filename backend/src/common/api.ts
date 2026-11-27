import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { ZodError, ZodTypeAny, z } from 'zod';
import { AppError, badRequest } from './errors';

/** Identity of the caller, created from the server session (never from the request body). */
export interface RequestContext {
  actorId: string;
  roles: string[];
  requestId: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    ctx?: RequestContext;
    requestId?: string;
  }
}

/** Envelope of every response (ApiResponse<T>). */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; fields?: Record<string, string>; details?: Record<string, unknown> };
  requestId: string;
}

export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.requestId = crypto.randomUUID();
  next();
}

export function send<T>(req: Request, res: Response, data: T, status = 200) {
  const body: ApiResponse<T> = { success: true, data, requestId: req.requestId ?? '' };
  res.status(status).json(body);
}

/** RequestValidator: checks the shape of a payload with a zod schema. */
export function validate<S extends ZodTypeAny>(schema: S, input: unknown): z.infer<S> {
  const r = schema.safeParse(input);
  if (r.success) return r.data;
  throw zodToBadRequest(r.error);
}

function zodToBadRequest(e: ZodError): AppError {
  const fields: Record<string, string> = {};
  for (const issue of e.issues) {
    const key = issue.path.join('.') || '_';
    if (!fields[key]) fields[key] = issue.message;
  }
  return badRequest('Dữ liệu chưa hợp lệ. Vui lòng kiểm tra các trường được đánh dấu.', fields);
}

/** Wraps an async handler so that its errors reach the ApiErrorHandler. */
export const handler =
  (fn: (req: Request, res: Response) => Promise<void> | void) => (req: Request, res: Response, next: NextFunction) => {
    try {
      const r = fn(req, res);
      if (r && typeof (r as Promise<void>).catch === 'function') (r as Promise<void>).catch(next);
    } catch (e) {
      next(e);
    }
  };

/** Placeholder of a use case that is not built yet (Sprint 5): every request gets 501. The owner replaces it with the real router. */
export const notImplemented = (useCase: string) => (_req: Request, res: Response) => {
  res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: `${useCase} chưa được hiện thực.` } });
};

/** ApiErrorHandler: a public error without internal details. */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = req.requestId ?? '';
  if (err instanceof AppError) {
    const { fields, ...rest } = (err.details ?? {}) as { fields?: Record<string, string> } & Record<string, unknown>;
    const body: ApiResponse<never> = {
      success: false,
      error: { code: err.code, message: err.message, ...(fields ? { fields } : {}), ...(Object.keys(rest).length ? { details: rest } : {}) },
      requestId,
    };
    res.status(err.status).json(body);
    return;
  }
  if (err && typeof err === 'object' && (err as { type?: string }).type === 'entity.parse.failed') {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Nội dung yêu cầu không phải JSON hợp lệ.' }, requestId });
    return;
  }
  console.error(`[${requestId}]`, err);
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau.' }, requestId });
}
