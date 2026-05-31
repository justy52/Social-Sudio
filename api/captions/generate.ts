import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleApiError, methodNotAllowed, parseJsonBody, sendJson } from '../../src/lib/api-helpers.ts';
import { requireBusinessOwnership } from '../../src/lib/auth.ts';
import { assertOwnedBusinessForCaptions, generateCaption } from '../../src/lib/ai/captions.ts';
import { captionGenerateSchema } from '../../src/lib/validation.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return methodNotAllowed(res, ['POST']);
    }

    const input = captionGenerateSchema.parse(parseJsonBody(req));
    const { userId, business } = await requireBusinessOwnership(req, input.businessId);

    assertOwnedBusinessForCaptions(business, userId);

    const result = await generateCaption(business, input);

    return sendJson(res, 200, result);
  } catch (error) {
    return handleApiError(res, error);
  }
}
