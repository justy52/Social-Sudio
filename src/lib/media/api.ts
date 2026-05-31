import { randomUUID } from 'node:crypto';
import { ApiError } from '../api-helpers.ts';

export const maxImageUploadBytes = 10 * 1024 * 1024;
export const allowedImageMimeTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type MediaUploadFile = {
  fileName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
};

export type MediaUploadPostContext = {
  post: {
    id: string;
    businessId: string;
  };
  business: {
    id: string;
  };
};

export type MediaOwnershipContext = {
  media: {
    id: string;
    blobKey: string;
  };
  business: {
    userId: string;
  };
};

export type BlobPutResult = {
  url: string;
  pathname?: string;
};

export type BlobStorageAdapter = {
  put: (
    pathname: string,
    body: Buffer,
    options: { contentType: string; token: string },
  ) => Promise<BlobPutResult>;
  del: (pathname: string, options: { token: string }) => Promise<void>;
};

export type CreateMediaRecordInput = {
  postId: string;
  blobUrl: string;
  blobKey: string;
  mimeType: string;
  width?: number;
  height?: number;
  isEdited: boolean;
  originalUrl: string | null;
};

export function requireBlobReadWriteToken(token: string | undefined) {
  if (!token) {
    throw new ApiError(500, 'Blob storage is not configured.');
  }

  return token;
}

export function assertMediaUploadAuthenticated(userId: string | null | undefined) {
  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }
}

export function assertOwnedPostForMediaUpload(
  context: MediaUploadPostContext | null | undefined,
  postId: string,
) {
  if (!context || context.post.id !== postId || context.post.businessId !== context.business.id) {
    throw new ApiError(404, 'Post not found');
  }
}

export function assertOwnedMediaForDelete(
  context: MediaOwnershipContext | null | undefined,
  userId: string,
) {
  if (!context || context.business.userId !== userId) {
    throw new ApiError(404, 'Media not found');
  }
}

export function assertValidImageUpload(file: MediaUploadFile | null | undefined) {
  if (!file) {
    throw new ApiError(400, 'Image file is required');
  }

  if (!allowedImageMimeTypes.includes(file.mimeType as (typeof allowedImageMimeTypes)[number])) {
    throw new ApiError(400, 'Choose a JPEG, PNG, or WebP image. HEIC and HEIF are not supported.');
  }

  if (file.size > maxImageUploadBytes) {
    throw new ApiError(413, 'Image must be 10MB or smaller');
  }
}

export function sanitizeFileName(fileName: string) {
  const baseName = fileName.split(/[\\/]/).pop() ?? 'image';
  const sanitized = baseName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

  return sanitized || 'image';
}

export function buildMediaBlobKey(input: {
  businessId: string;
  postId: string;
  fileName: string;
  id?: string;
}) {
  const id = input.id ?? randomUUID();
  return `businesses/${input.businessId}/posts/${input.postId}/${id}-${sanitizeFileName(input.fileName)}`;
}

export async function uploadPostMedia<TMedia>(input: {
  token: string | undefined;
  file: MediaUploadFile | null | undefined;
  postId: string;
  context: MediaUploadPostContext | null | undefined;
  storage: BlobStorageAdapter;
  createMediaRecord: (record: CreateMediaRecordInput) => Promise<TMedia>;
  id?: string;
  isEdited?: boolean;
  originalUrl?: string | null;
  width?: number;
  height?: number;
}) {
  const token = requireBlobReadWriteToken(input.token);
  assertValidImageUpload(input.file);

  const file = input.file;
  if (!file || !input.context) {
    throw new ApiError(404, 'Post not found');
  }

  assertOwnedPostForMediaUpload(input.context, input.postId);

  const blobKey = buildMediaBlobKey({
    businessId: input.context.business.id,
    postId: input.postId,
    fileName: file.fileName,
    id: input.id,
  });

  let blob: BlobPutResult;
  try {
    logMediaUploadDiagnostics('blob-upload-start', {
      route: input.isEdited ? 'edited' : 'upload',
      mimeType: file.mimeType,
      size: file.size,
      hasBlobToken: Boolean(input.token),
    });

    blob = await input.storage.put(blobKey, file.buffer, {
      contentType: file.mimeType,
      token,
    });
  } catch {
    logMediaUploadDiagnostics('blob-upload-failed', {
      route: input.isEdited ? 'edited' : 'upload',
      mimeType: file.mimeType,
      size: file.size,
      hasBlobToken: Boolean(input.token),
    });
    throw new ApiError(502, 'Blob storage upload failed. Check storage configuration.');
  }

  return input.createMediaRecord({
    postId: input.postId,
    blobUrl: blob.url,
    blobKey: blob.pathname ?? blobKey,
    mimeType: file.mimeType,
    isEdited: input.isEdited ?? false,
    originalUrl: input.originalUrl ?? null,
    width: input.width,
    height: input.height,
  });
}

export function logMediaUploadDiagnostics(
  event: string,
  details: {
    route: 'upload' | 'edited';
    mimeType?: string;
    size?: number;
    hasBlobToken: boolean;
  },
) {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  console.info('[media]', event, details);
}

export async function deletePostMedia(input: {
  token: string | undefined;
  media: { id: string; blobKey: string } | null | undefined;
  storage: BlobStorageAdapter;
  deleteMediaRecord: (mediaId: string) => Promise<void>;
}) {
  const token = requireBlobReadWriteToken(input.token);

  if (!input.media) {
    throw new ApiError(404, 'Media not found');
  }

  try {
    await input.storage.del(input.media.blobKey, { token });
  } catch {
    throw new ApiError(502, 'Media delete failed. Please try again.');
  }

  await input.deleteMediaRecord(input.media.id);

  return { deleted: true };
}
