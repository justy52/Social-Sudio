import type { VercelRequest, VercelResponse } from '@vercel/node';
import { asc, eq } from 'drizzle-orm';
import {
  ApiError,
  getQueryValue,
  handleApiError,
  methodNotAllowed,
  parseJsonBody,
  sendJson,
} from '../../src/lib/api-helpers';
import { requirePostOwnership } from '../../src/lib/auth';
import { db } from '../../src/lib/db';
import { postMedia, posts } from '../../src/lib/db/schema';
import { buildUpdatePostValues } from '../../src/lib/posts/api';
import { postIdSchema, postUpdateSchema } from '../../src/lib/validation';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      return await getPost(req, res);
    }

    if (req.method === 'PUT') {
      return await updatePost(req, res);
    }

    if (req.method === 'DELETE') {
      return await deletePost(req, res);
    }

    return methodNotAllowed(res, ['GET', 'PUT', 'DELETE']);
  } catch (error) {
    return handleApiError(res, error);
  }
}

function getPostId(req: VercelRequest) {
  const postId = getQueryValue(req.query.id);

  if (!postId) {
    throw new ApiError(400, 'Post id is required');
  }

  return postIdSchema.parse(postId);
}

async function getPost(req: VercelRequest, res: VercelResponse) {
  const postId = getPostId(req);
  const { post } = await requirePostOwnership(req, postId);
  const media = await db
    .select()
    .from(postMedia)
    .where(eq(postMedia.postId, postId))
    .orderBy(asc(postMedia.createdAt));

  return sendJson(res, 200, { post, media });
}

async function updatePost(req: VercelRequest, res: VercelResponse) {
  const postId = getPostId(req);
  const { post } = await requirePostOwnership(req, postId);
  const input = postUpdateSchema.parse(parseJsonBody(req));
  const values = buildUpdatePostValues(post.status, input);

  const [updatedPost] = await db.update(posts).set(values).where(eq(posts.id, postId)).returning();

  return sendJson(res, 200, { post: updatedPost });
}

async function deletePost(req: VercelRequest, res: VercelResponse) {
  const postId = getPostId(req);
  await requirePostOwnership(req, postId);
  await db.delete(posts).where(eq(posts.id, postId));

  return sendJson(res, 200, { deleted: true });
}
