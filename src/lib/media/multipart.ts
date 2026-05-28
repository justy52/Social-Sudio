import type { VercelRequest } from '@vercel/node';
import { ApiError } from '../api-helpers.ts';
import type { MediaUploadFile } from './api.ts';

export type MultipartFormData = {
  fields: Record<string, string>;
  files: Record<string, MediaUploadFile>;
};

export async function parseMultipartFormData(req: VercelRequest): Promise<MultipartFormData> {
  const contentType = Array.isArray(req.headers['content-type'])
    ? req.headers['content-type'][0]
    : req.headers['content-type'];
  const boundaryMatch = contentType?.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  const boundary = boundaryMatch?.[1] ?? boundaryMatch?.[2];

  if (!contentType?.toLowerCase().startsWith('multipart/form-data') || !boundary) {
    throw new ApiError(400, 'Multipart form data is required');
  }

  return parseMultipartBuffer(await readRequestBodyBuffer(req), boundary);
}

export function parseMultipartBuffer(body: Buffer, boundary: string): MultipartFormData {
  const fields: Record<string, string> = {};
  const files: Record<string, MediaUploadFile> = {};
  const raw = body.toString('binary');
  const parts = raw.split(`--${boundary}`);

  for (const part of parts) {
    if (!part || part === '--\r\n' || part === '--') {
      continue;
    }

    const normalized = part.startsWith('\r\n') ? part.slice(2) : part;
    const headerEnd = normalized.indexOf('\r\n\r\n');
    if (headerEnd === -1) {
      continue;
    }

    const headerText = normalized.slice(0, headerEnd);
    let content = normalized.slice(headerEnd + 4);
    if (content.endsWith('\r\n')) {
      content = content.slice(0, -2);
    }

    const disposition = headerText.match(/^content-disposition:\s*([^\r\n]+)$/im)?.[1];
    const name = disposition?.match(/name="([^"]+)"/i)?.[1];
    if (!name) {
      continue;
    }

    const fileName = disposition?.match(/filename="([^"]*)"/i)?.[1];
    if (fileName !== undefined) {
      const mimeType =
        headerText.match(/^content-type:\s*([^\r\n]+)$/im)?.[1]?.trim().toLowerCase() ??
        'application/octet-stream';
      const buffer = Buffer.from(content, 'binary');

      files[name] = {
        fileName,
        mimeType,
        size: buffer.byteLength,
        buffer,
      };
    } else {
      fields[name] = Buffer.from(content, 'binary').toString('utf8');
    }
  }

  return { fields, files };
}

async function readRequestBodyBuffer(req: VercelRequest) {
  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (typeof req.body === 'string') {
    return Buffer.from(req.body, 'binary');
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req as AsyncIterable<Buffer | string>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}
