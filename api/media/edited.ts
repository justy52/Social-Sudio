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
import { editedMediaUploadFieldsSchema } from '../../src/lib/validation';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return methodNotAllowed(res, ['POST']);
    }

    const auth = await requireAuth(req);
    const form = await parseMultipartFormData(req);
    const fields = editedMediaUploadFieldsSchema.parse(form.fields);
    logMediaUploadDiagnostics('route-reached', {
      route: 'edited',
      mimeType: form.files.file?.mimeType,
      size: form.files.file?.size,
      hasBlobToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    });
    const { userId, post, business } = await requirePostOwnership(req, fields.postId);

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
