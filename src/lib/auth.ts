import type { VercelRequest } from '@vercel/node';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { and, eq } from 'drizzle-orm';
import { ApiError } from './api-helpers';
import { db } from './db';
import { businesses, postMedia, posts, users } from './db/schema';
import { loadServerEnv } from './server-env';

loadServerEnv();

function readHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getBearerToken(req: VercelRequest) {
  const header = readHeader(req.headers.authorization);

  if (!header?.startsWith('Bearer ')) {
    return null;
  }

  return header.slice('Bearer '.length);
}

export async function requireAuth(req: VercelRequest) {
  const token = getBearerToken(req);

  if (!token) {
    logLocalAuthDiagnostics(req, 'missing_token');
    throw new ApiError(401, 'Unauthorized');
  }

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    if (!payload.sub) {
      logLocalAuthDiagnostics(req, 'missing_subject');
      throw new ApiError(401, 'Unauthorized');
    }

    logLocalAuthDiagnostics(req, 'verified');
    return { userId: payload.sub };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logLocalAuthDiagnostics(req, 'verification_failed', error);
    throw new ApiError(401, 'Unauthorized');
  }
}

function logLocalAuthDiagnostics(
  req: VercelRequest,
  outcome: 'missing_token' | 'missing_subject' | 'verified' | 'verification_failed',
  error?: unknown,
) {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  const header = readHeader(req.headers.authorization);
  console.warn('[auth:local]', {
    path: req.url,
    authHeaderPresent: Boolean(header),
    bearerTokenPresent: Boolean(getBearerToken(req)),
    clerkSecretPresent: Boolean(process.env.CLERK_SECRET_KEY),
    clerkSecretKind: getClerkSecretKind(process.env.CLERK_SECRET_KEY),
    outcome,
    errorCategory: error ? getAuthErrorCategory(error) : null,
  });
}

function getClerkSecretKind(secretKey: string | undefined) {
  if (!secretKey) {
    return 'missing';
  }

  if (secretKey.startsWith('sk_test_')) {
    return 'test';
  }

  if (secretKey.startsWith('sk_live_')) {
    return 'live';
  }

  return 'unknown';
}

function getAuthErrorCategory(error: unknown) {
  if (!error || typeof error !== 'object') {
    return 'unknown';
  }

  const value = error as { message?: unknown; status?: unknown; statusCode?: unknown };
  const status = typeof value.status === 'number' ? value.status : value.statusCode;
  const message = typeof value.message === 'string' ? value.message.toLowerCase() : '';

  if (status === 401 || message.includes('unauthorized')) {
    return 'unauthorized';
  }

  if (message.includes('expired')) {
    return 'expired';
  }

  if (message.includes('issuer') || message.includes('signature') || message.includes('jwt')) {
    return 'invalid_token';
  }

  if (message.includes('secret')) {
    return 'missing_or_invalid_secret';
  }

  return 'verification_error';
}

export async function syncCurrentUserFromClerk(userId: string) {
  if (!process.env.CLERK_SECRET_KEY) {
    throw new ApiError(500, 'Clerk is not configured');
  }

  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  const clerkUser = await clerk.users.getUser(userId);
  const primaryEmail =
    clerkUser.emailAddresses.find((email) => email.id === clerkUser.primaryEmailAddressId)
      ?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

  if (!primaryEmail) {
    throw new ApiError(400, 'Clerk user has no email address');
  }

  const [user] = await db
    .insert(users)
    .values({
      id: userId,
      email: primaryEmail,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      avatarUrl: clerkUser.imageUrl,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: primaryEmail,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        avatarUrl: clerkUser.imageUrl,
        updatedAt: new Date(),
      },
    })
    .returning();

  return user;
}

export async function requireBusinessOwnership(req: VercelRequest, businessId: string) {
  const { userId } = await requireAuth(req);

  const [business] = await db
    .select()
    .from(businesses)
    .where(and(eq(businesses.id, businessId), eq(businesses.userId, userId)))
    .limit(1);

  if (!business) {
    throw new ApiError(404, 'Business not found');
  }

  return { userId, business };
}

export async function requirePostOwnership(req: VercelRequest, postId: string) {
  const { userId } = await requireAuth(req);

  const [row] = await db
    .select({ post: posts, business: businesses })
    .from(posts)
    .innerJoin(businesses, eq(posts.businessId, businesses.id))
    .where(and(eq(posts.id, postId), eq(businesses.userId, userId)))
    .limit(1);

  if (!row) {
    throw new ApiError(404, 'Post not found');
  }

  return { userId, post: row.post, business: row.business };
}

export async function requirePostMediaOwnership(req: VercelRequest, mediaId: string) {
  const { userId } = await requireAuth(req);

  const [row] = await db
    .select({ media: postMedia, post: posts, business: businesses })
    .from(postMedia)
    .innerJoin(posts, eq(postMedia.postId, posts.id))
    .innerJoin(businesses, eq(posts.businessId, businesses.id))
    .where(and(eq(postMedia.id, mediaId), eq(businesses.userId, userId)))
    .limit(1);

  if (!row) {
    throw new ApiError(404, 'Media not found');
  }

  return { userId, media: row.media, post: row.post, business: row.business };
}
