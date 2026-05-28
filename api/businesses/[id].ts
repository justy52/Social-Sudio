import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import {
  ApiError,
  getQueryValue,
  handleApiError,
  methodNotAllowed,
  parseJsonBody,
  sendJson,
} from '../../src/lib/api-helpers';
import { requireBusinessOwnership } from '../../src/lib/auth';
import { db } from '../../src/lib/db';
import { businesses } from '../../src/lib/db/schema';
import { businessUpdateSchema } from '../../src/lib/validation';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'PUT') {
      return methodNotAllowed(res, ['PUT']);
    }

    const businessId = getQueryValue(req.query.id);

    if (!businessId) {
      throw new ApiError(400, 'Business id is required');
    }

    await requireBusinessOwnership(req, businessId);

    const input = businessUpdateSchema.parse(parseJsonBody(req));
    const [business] = await db
      .update(businesses)
      .set({
        name: input.name,
        industry: input.industry,
        websiteUrl: input.websiteUrl,
        brandVoice: input.brandVoice,
        primaryColor: input.primaryColor,
        accentColor: input.accentColor,
        logoUrl: input.logoUrl,
        timezone: input.timezone,
        updatedAt: new Date(),
      })
      .where(eq(businesses.id, businessId))
      .returning();

    return sendJson(res, 200, { business });
  } catch (error) {
    return handleApiError(res, error);
  }
}
