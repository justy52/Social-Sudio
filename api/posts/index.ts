import type { VercelRequest, VercelResponse } from '@vercel/node';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { handleApiError, methodNotAllowed, parseJsonBody, sendJson } from '../../src/lib/api-helpers.ts';
import { requireAuth, requireBusinessOwnership } from '../../src/lib/auth.ts';
import { db } from '../../src/lib/db/index.ts';
import { businesses, postMedia, posts } from '../../src/lib/db/schema.ts';
import { buildCreatePostValues, mapOwnedPostRows } from '../../src/lib/posts/api.ts';
import { postCreateSchema, postListQuerySchema } from '../../src/lib/validation.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      return await listPosts(req, res);
    }

    if (req.method === 'POST') {
      return await createPost(req, res);
    }

    return methodNotAllowed(res, ['GET', 'POST']);
  } catch (error) {
    return handleApiError(res, error);
  }
}

async function listPosts(req: VercelRequest, res: VercelResponse) {
  const query = postListQuerySchema.parse(req.query);

  if (query.businessId) {
    const { userId } = await requireBusinessOwnership(req, query.businessId);
    const rows = await db
      .select({ post: posts, business: businesses })
      .from(posts)
      .innerJoin(businesses, eq(posts.businessId, businesses.id))
      .where(and(eq(businesses.userId, userId), eq(posts.businessId, query.businessId)))
      .orderBy(desc(posts.updatedAt));

    return sendJson(res, 200, { posts: await addMediaSummaries(mapOwnedPostRows(rows, userId)) });
  }

  const { userId } = await requireAuth(req);
  const rows = await db
    .select({ post: posts, business: businesses })
    .from(posts)
    .innerJoin(businesses, eq(posts.businessId, businesses.id))
    .where(eq(businesses.userId, userId))
    .orderBy(desc(posts.updatedAt));

  return sendJson(res, 200, { posts: await addMediaSummaries(mapOwnedPostRows(rows, userId)) });
}

async function createPost(req: VercelRequest, res: VercelResponse) {
  const input = postCreateSchema.parse(parseJsonBody(req));

  await requireBusinessOwnership(req, input.businessId);

  const [post] = await db.insert(posts).values(buildCreatePostValues(input)).returning();

  return sendJson(res, 201, { post });
}

async function addMediaSummaries(postRows: (typeof posts.$inferSelect)[]) {
  if (postRows.length === 0) {
    return [];
  }

  const mediaRows = await db
    .select()
    .from(postMedia)
    .where(
      inArray(
        postMedia.postId,
        postRows.map((post) => post.id),
      ),
    )
    .orderBy(asc(postMedia.createdAt));
  const mediaByPost = new Map<string, typeof mediaRows>();

  for (const media of mediaRows) {
    mediaByPost.set(media.postId, [...(mediaByPost.get(media.postId) ?? []), media]);
  }

  return postRows.map((post) => {
    const media = mediaByPost.get(post.id) ?? [];

    return {
      ...post,
      mediaCount: media.length,
      firstMedia: media[0] ?? null,
    };
  });
}
