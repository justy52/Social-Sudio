import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ZodError } from 'zod';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function sendJson<T>(res: VercelResponse, status: number, data: T) {
  return res.status(status).json(data);
}

export function methodNotAllowed(res: VercelResponse, methods: string[]) {
  res.setHeader('Allow', methods.join(', '));
  return sendJson(res, 405, { error: 'Method not allowed' });
}

export function getQueryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export function parseJsonBody(req: VercelRequest) {
  if (!req.body) {
    return {};
  }

  if (typeof req.body === 'string') {
    return JSON.parse(req.body);
  }

  return req.body;
}

export function handleApiError(res: VercelResponse, error: unknown) {
  if (error instanceof ApiError) {
    return sendJson(res, error.status, { error: error.message });
  }

  if (error instanceof ZodError) {
    return sendJson(res, 400, {
      error: 'Invalid request body',
      issues: error.flatten().fieldErrors,
    });
  }

  console.error(error);
  return sendJson(res, 500, { error: 'Internal server error' });
}
