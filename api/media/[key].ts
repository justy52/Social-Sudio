import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import {
  ApiError,
  getQueryValue,
  handleApiError,
  methodNotAllowed,
  sendJson,
} from '../../src/lib/api-helpers';
import { requireAuth, requirePostMediaOwnership } from '../../src/lib/auth';
import { db } from '../../src/lib/db';
import { postMedia } from '../../src/lib/db/schema';
import { assertOwnedMediaForDelete, deletePostMedia } from '../../src/lib/media/api';
import { vercelBlobStorage } from '../../src/lib/media/blob';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'DELETE') {
      return methodNotAllowed(res, ['DELETE']);
    }

    await requireAuth(req);

    const blobKey = getQueryValue(req.query.key);
    if (!blobKey) {
      throw new ApiError(400, 'Media key is required');
    }

    const [media] = await db.select().from(postMedia).where(eq(postMedia.blobKey, blobKey)).limit(1);
    if (!media) {
      throw new ApiError(404, 'Media not found');
    }

    const ownedMedia = await requirePostMediaOwnership(req, media.id);
    assertOwnedMediaForDelete(ownedMedia, ownedMedia.userId);

    const result = await deletePostMedia({
      token: process.env.BLOB_READ_WRITE_TOKEN,
      media,
      storage: vercelBlobStorage,
      deleteMediaRecord: async (mediaId) => {
        await db.delete(postMedia).where(eq(postMedia.id, mediaId));
      },
    });

    return sendJson(res, 200, result);
  } catch (error) {
    return handleApiError(res, error);
  }
}
