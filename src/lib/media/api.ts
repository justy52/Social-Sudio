import { randomUUID } from 'node:crypto';
import { ApiError } from '../api-helpers.ts';
import { loadServerEnv } from '../server-env.ts';

loadServerEnv();

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
    options: BlobStorageAuth & { contentType: string },
  ) => Promise<BlobPutResult>;
  del: (pathname: string, options: BlobStorageAuth) => Promise<void>;
};

export type BlobStorageAuth = {
  token?: string;
  oidcToken?: string;
  storeId?: string;
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

export type BlobStorageAuthStatus = BlobStorageAuth & {
  mode: 'oidc' | 'token' | 'none';
  hasReadWriteToken: boolean;
  hasOidcToken: boolean;
  hasBlobStoreId: boolean;
  hasUsableCredentials: boolean;
};

export function getBlobStorageAuth(env: NodeJS.ProcessEnv = process.env): BlobStorageAuthStatus {
  const token = env.BLOB_READ_WRITE_TOKEN?.trim() || undefined;
  const oidcToken = env.VERCEL_OIDC_TOKEN?.trim() || undefined;
  const storeId = env.BLOB_STORE_ID?.trim() || undefined;
  const hasOidcCredentials = Boolean(oidcToken && storeId);

  return {
    mode: hasOidcCredentials ? 'oidc' : token ? 'token' : 'none',
    token: hasOidcCredentials ? undefined : token,
    oidcToken,
    storeId,
    hasReadWriteToken: Boolean(token),
    hasOidcToken: Boolean(oidcToken),
    hasBlobStoreId: Boolean(storeId),
    hasUsableCredentials: Boolean(token || hasOidcCredentials),
  };
}

export function requireBlobStorageAuth(auth: BlobStorageAuthStatus) {
  if (!auth.hasUsableCredentials) {
    throw new ApiError(500, 'Blob storage is not configured.');
  }

  return auth;
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
  const auth = requireBlobStorageAuth(
    getBlobStorageAuth({
      ...process.env,
      BLOB_READ_WRITE_TOKEN: input.token ?? process.env.BLOB_READ_WRITE_TOKEN,
    }),
  );
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
      fileName: file.fileName,
      mimeType: file.mimeType,
      size: file.size,
      postIdPresent: Boolean(input.postId),
      selectedAuthMode: auth.mode,
      hasBlobToken: auth.hasReadWriteToken,
      hasOidcToken: auth.hasOidcToken,
      hasBlobStoreId: auth.hasBlobStoreId,
    });

    blob = await input.storage.put(blobKey, file.buffer, {
      contentType: file.mimeType,
      token: auth.token,
      oidcToken: auth.token ? undefined : auth.oidcToken,
      storeId: auth.token ? undefined : auth.storeId,
    });
  } catch (error) {
    const safeBlobError = readSafeBlobError(error);
    logMediaUploadDiagnostics('blob-upload-failed', {
      route: input.isEdited ? 'edited' : 'upload',
      fileName: file.fileName,
      mimeType: file.mimeType,
      size: file.size,
      postIdPresent: Boolean(input.postId),
      selectedAuthMode: auth.mode,
      hasBlobToken: auth.hasReadWriteToken,
      hasOidcToken: auth.hasOidcToken,
      hasBlobStoreId: auth.hasBlobStoreId,
      blobError: safeBlobError,
    });
    throw new ApiError(502, buildBlobUploadErrorMessage(safeBlobError));
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
    fileName?: string;
    mimeType?: string;
    size?: number;
    authHeaderPresent?: boolean;
    userIdResolved?: boolean;
    filePresent?: boolean;
    postIdPresent?: boolean;
    postOwnership?: 'passed' | 'failed';
    selectedAuthMode?: BlobStorageAuthStatus['mode'];
    hasBlobToken: boolean;
    hasOidcToken?: boolean;
    hasBlobStoreId?: boolean;
    blobError?: SafeBlobError;
  },
) {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  console.info('[media]', event, details);
}

export type SafeBlobError = {
  name: string | null;
  message: string | null;
  status: number | null;
};

export function readSafeBlobError(error: unknown): SafeBlobError {
  if (!error || typeof error !== 'object') {
    return {
      name: null,
      message: typeof error === 'string' ? error : null,
      status: null,
    };
  }

  const value = error as {
    name?: unknown;
    message?: unknown;
    status?: unknown;
    statusCode?: unknown;
  };
  const status = typeof value.status === 'number'
    ? value.status
    : typeof value.statusCode === 'number'
      ? value.statusCode
      : null;

  return {
    name: typeof value.name === 'string' ? value.name : null,
    message: typeof value.message === 'string' ? value.message : null,
    status,
  };
}

export function buildBlobUploadErrorMessage(error: SafeBlobError) {
  const message = error.message ?? '';
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('no read-write token') || lowerMessage.includes('no blob credentials')) {
    return 'Blob upload failed: missing Blob credentials.';
  }

  if (lowerMessage.includes('cannot use public access on a private store')) {
    return 'Blob upload failed: this Blob store is private, but Social Studio needs public Blob storage for image previews.';
  }

  if (lowerMessage.includes('this store does not exist') || lowerMessage.includes('store not found')) {
    return 'Blob upload failed: Blob store was not found. Check BLOB_STORE_ID and the Vercel Blob project connection.';
  }

  if (
    lowerMessage.includes('oidc') &&
    lowerMessage.includes('development') &&
    lowerMessage.includes('not')
  ) {
    return 'Blob upload failed: OIDC is not enabled for local development. Test uploads in Vercel Preview or use a read-write Blob token for local uploads.';
  }

  if (
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('forbidden') ||
    error.status === 401 ||
    error.status === 403
  ) {
    return 'Blob upload failed: unauthorized token.';
  }

  if (lowerMessage.includes('invalid') || error.status === 400) {
    return 'Blob upload failed: invalid request.';
  }

  return 'Blob storage upload failed. Check storage configuration.';
}

export async function deletePostMedia(input: {
  token: string | undefined;
  media: { id: string; blobKey: string } | null | undefined;
  storage: BlobStorageAdapter;
  deleteMediaRecord: (mediaId: string) => Promise<void>;
}) {
  const auth = requireBlobStorageAuth(
    getBlobStorageAuth({
      ...process.env,
      BLOB_READ_WRITE_TOKEN: input.token ?? process.env.BLOB_READ_WRITE_TOKEN,
    }),
  );

  if (!input.media) {
    throw new ApiError(404, 'Media not found');
  }

  try {
    await input.storage.del(input.media.blobKey, {
      token: auth.token,
      oidcToken: auth.token ? undefined : auth.oidcToken,
      storeId: auth.token ? undefined : auth.storeId,
    });
  } catch {
    throw new ApiError(502, 'Media delete failed. Please try again.');
  }

  await input.deleteMediaRecord(input.media.id);

  return { deleted: true };
}
