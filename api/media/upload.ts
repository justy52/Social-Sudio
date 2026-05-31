import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleApiError, methodNotAllowed, sendJson } from '../../src/lib/api-helpers';
import { requireAuth, requirePostOwnership } from '../../src/lib/auth';
import { db } from '../../src/lib/db';
import { postMedia } from '../../src/lib/db/schema';
import {
  assertMediaUploadAuthenticated,
  assertOwnedPostForMediaUpload,
  logMediaUploadDiagnostics,
  uploadPostMedia,
} from '../../src/lib/media/api';
import { vercelBlobStorage } from '../../src/lib/media/blob';
import { parseMultipartFormData } from '../../src/lib/media/multipart';
import { postIdSchema } from '../../src/lib/validation';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return methodNotAllowed(res, ['POST']);
    }

    const auth = await requireAuth(req);
    const form = await parseMultipartFormData(req);
    const postId = postIdSchema.parse(form.fields.post_id);
    logMediaUploadDiagnostics('route-reached', {
      route: 'upload',
      fileName: form.files.file?.fileName,
      mimeType: form.files.file?.mimeType,
      size: form.files.file?.size,
      postIdPresent: Boolean(form.fields.post_id),
      hasBlobToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      hasOidcToken: Boolean(process.env.VERCEL_OIDC_TOKEN),
      hasBlobStoreId: Boolean(process.env.BLOB_STORE_ID),
    });
    const { userId, post, business } = await requirePostOwnership(req, postId);

    assertMediaUploadAuthenticated(auth.userId);
    assertMediaUploadAuthenticated(userId);
    assertOwnedPostForMediaUpload({ post, business }, postId);

    const media = await uploadPostMedia({
      token: process.env.BLOB_READ_WRITE_TOKEN,
      file: form.files.file,
      postId,
      context: { post, business },
      storage: vercelBlobStorage,
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
