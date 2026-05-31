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

  logMultipartDiagnostics('request-received', req);

  if (!contentType?.toLowerCase().startsWith('multipart/form-data') || !boundary) {
    throw new ApiError(400, 'Multipart form data is required');
  }

  const form = parseMultipartBuffer(await readRequestBodyBuffer(req), boundary);
  logMultipartDiagnostics('request-parsed', req, form);

  return form;
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

export function readMultipartRequestDiagnostics(
  req: VercelRequest,
  form?: MultipartFormData,
) {
  const contentType = Array.isArray(req.headers['content-type'])
    ? req.headers['content-type'][0]
    : req.headers['content-type'];
  const contentLength = Array.isArray(req.headers['content-length'])
    ? req.headers['content-length'][0]
    : req.headers['content-length'];
  const transferEncoding = Array.isArray(req.headers['transfer-encoding'])
    ? req.headers['transfer-encoding'][0]
    : req.headers['transfer-encoding'];

  return {
    method: req.method,
    contentTypePresent: Boolean(contentType),
    contentTypeIsMultipart: Boolean(
      contentType?.toLowerCase().startsWith('multipart/form-data'),
    ),
    contentLengthPresent: Boolean(contentLength),
    transferEncodingPresent: Boolean(transferEncoding),
    bodyPresent: req.body !== undefined && req.body !== null,
    bodyType: readSafeBodyType(req.body),
    streamReadable: Boolean((req as { readable?: boolean }).readable),
    streamReadableEnded: Boolean((req as { readableEnded?: boolean }).readableEnded),
    fieldsFound: form ? Object.keys(form.fields) : undefined,
    filesFound: form
      ? Object.entries(form.files).map(([fieldName, file]) => ({
          fieldName,
          fileName: file.fileName,
          mimeType: file.mimeType,
          size: file.size,
        }))
      : undefined,
  };
}

export function logMultipartDiagnostics(
  event: string,
  req: VercelRequest,
  form?: MultipartFormData,
) {
  if (process.env.NODE_ENV !== 'development' && process.env.VERCEL_ENV !== 'preview') {
    return;
  }

  console.info('[multipart]', event, readMultipartRequestDiagnostics(req, form));
}

function readSafeBodyType(body: unknown) {
  if (body === undefined) {
    return 'undefined';
  }

  if (body === null) {
    return 'null';
  }

  if (Buffer.isBuffer(body)) {
    return 'buffer';
  }

  if (typeof body === 'string') {
    return 'string';
  }

  if (body instanceof Uint8Array) {
    return 'uint8array';
  }

  if (Array.isArray(body)) {
    return 'array';
  }

  return typeof body;
}

async function readRequestBodyBuffer(req: VercelRequest) {
  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (typeof req.body === 'string') {
    return Buffer.from(req.body, 'binary');
  }

  if (req.body instanceof Uint8Array) {
    return Buffer.from(req.body);
  }

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on('data', (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
