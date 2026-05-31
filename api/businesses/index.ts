import type { VercelRequest, VercelResponse } from '@vercel/node';
import { asc, eq } from 'drizzle-orm';
import { handleApiError, methodNotAllowed, parseJsonBody, sendJson } from '../../src/lib/api-helpers.ts';
import { requireAuth, syncCurrentUserFromClerk } from '../../src/lib/auth.ts';
import { db } from '../../src/lib/db/index.ts';
import { businesses } from '../../src/lib/db/schema.ts';
import { createBusinessSlug } from '../../src/lib/slug.ts';
import { businessCreateSchema } from '../../src/lib/validation.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      return await listBusinesses(req, res);
    }

    if (req.method === 'POST') {
      return await createBusiness(req, res);
    }

    return methodNotAllowed(res, ['GET', 'POST']);
  } catch (error) {
    return handleApiError(res, error);
  }
}

async function listBusinesses(req: VercelRequest, res: VercelResponse) {
  const { userId } = await requireAuth(req);
  await syncCurrentUserFromClerk(userId);

  const rows = await db
    .select()
    .from(businesses)
    .where(eq(businesses.userId, userId))
    .orderBy(asc(businesses.createdAt));

  return sendJson(res, 200, { businesses: rows });
}

async function createBusiness(req: VercelRequest, res: VercelResponse) {
  const { userId } = await requireAuth(req);
  await syncCurrentUserFromClerk(userId);

  const input = businessCreateSchema.parse(parseJsonBody(req));
  const [business] = await db
    .insert(businesses)
    .values({
      userId,
      name: input.name,
      slug: createBusinessSlug(input.name),
      industry: input.industry,
      websiteUrl: input.websiteUrl,
      brandVoice: input.brandVoice,
      primaryColor: input.primaryColor,
      accentColor: input.accentColor,
      logoUrl: input.logoUrl,
      timezone: input.timezone,
    })
    .returning();

  return sendJson(res, 201, { business });
}
