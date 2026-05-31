import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ApiError, handleApiError, methodNotAllowed, sendJson } from '../../src/lib/api-helpers';
import { requireAuth, requirePostOwnership } from '../../src/lib/auth';
import { db } from '../../src/lib/db';
import { postMedia } from '../../src/lib/db/schema';
import {
  assertMediaUploadAuthenticated,
  assertOwnedPostForMediaUpload,
  getBlobStorageAuth,
  logMediaUploadDiagnostics,
  uploadPostMedia,
} from '../../src/lib/media/api';
import { vercelBlobStorage } from '../../src/lib/media/blob';
import { parseMultipartFormData } from '../../src/lib/media/multipart';
import { editedMediaUploadFieldsSchema } from '../../src/lib/validation';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return methodNotAllowed(res, ['POST']);
    }

    const auth = await requireAuth(req);
    logMediaUploadDiagnostics('route-authenticated', {
      route: 'edited',
      authHeaderPresent: Boolean(req.headers.authorization),
      userIdResolved: Boolean(auth.userId),
      selectedAuthMode: getBlobStorageAuth().mode,
      hasBlobToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      hasOidcToken: Boolean(process.env.VERCEL_OIDC_TOKEN),
      hasBlobStoreId: Boolean(process.env.BLOB_STORE_ID),
    });
    const form = await parseMultipartFormData(req);
    if (!form.fields.post_id) {
      throw new ApiError(400, 'Post id is required');
    }
    if (!form.files.file) {
      throw new ApiError(400, 'Image file is required');
    }
    const fields = editedMediaUploadFieldsSchema.parse(form.fields);
    logMediaUploadDiagnostics('route-reached', {
      route: 'edited',
      filePresent: Boolean(form.files.file),
      fileName: form.files.file?.fileName,
      mimeType: form.files.file?.mimeType,
      size: form.files.file?.size,
      postIdPresent: Boolean(form.fields.post_id),
      selectedAuthMode: getBlobStorageAuth().mode,
      hasBlobToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      hasOidcToken: Boolean(process.env.VERCEL_OIDC_TOKEN),
      hasBlobStoreId: Boolean(process.env.BLOB_STORE_ID),
    });
    let ownership: Awaited<ReturnType<typeof requirePostOwnership>>;
    try {
      ownership = await requirePostOwnership(req, fields.postId);
      logMediaUploadDiagnostics('post-ownership', {
        route: 'edited',
        postIdPresent: Boolean(fields.postId),
        postOwnership: 'passed',
        selectedAuthMode: getBlobStorageAuth().mode,
        hasBlobToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
        hasOidcToken: Boolean(process.env.VERCEL_OIDC_TOKEN),
        hasBlobStoreId: Boolean(process.env.BLOB_STORE_ID),
      });
    } catch (error) {
      logMediaUploadDiagnostics('post-ownership', {
        route: 'edited',
        postIdPresent: Boolean(fields.postId),
        postOwnership: 'failed',
        selectedAuthMode: getBlobStorageAuth().mode,
        hasBlobToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
        hasOidcToken: Boolean(process.env.VERCEL_OIDC_TOKEN),
        hasBlobStoreId: Boolean(process.env.BLOB_STORE_ID),
      });
      throw error;
    }
    const { userId, post, business } = ownership;

    assertMediaUploadAuthenticated(auth.userId);
    assertMediaUploadAuthenticated(userId);
    assertOwnedPostForMediaUpload({ post, business }, fields.postId);

    const media = await uploadPostMedia({
      token: process.env.BLOB_READ_WRITE_TOKEN,
      file: form.files.file,
      postId: fields.postId,
      context: { post, business },
      storage: vercelBlobStorage,
      isEdited: true,
      originalUrl: fields.originalUrl ?? null,
      width: fields.width,
      height: fields.height,
      createMediaRecord: async (record) => {
        const [createdMedia] = await db.insert(postMedia).values(record).returning();
        return createdMedia;
      },
    });

    return sendJson(res, 201, { media });
  } catch (error) {
    return handleApiError(res, error);
  }
}
