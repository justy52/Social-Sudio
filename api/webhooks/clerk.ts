import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { Webhook } from 'svix';
import { ApiError, handleApiError, sendJson } from '../../src/lib/api-helpers';
import { db } from '../../src/lib/db';
import { users } from '../../src/lib/db/schema';

interface ClerkWebhookEvent {
  type: 'user.created' | 'user.updated' | 'user.deleted' | string;
  data: {
    id?: string;
    email_addresses?: Array<{ id: string; email_address: string }>;
    primary_email_address_id?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    image_url?: string | null;
  };
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return sendJson(res, 405, { error: 'Method not allowed' });
    }

    const event = await verifyWebhook(req);

    if (event.type === 'user.created' || event.type === 'user.updated') {
      await upsertUser(event);
    }

    if (event.type === 'user.deleted' && event.data.id) {
      await db.delete(users).where(eq(users.id, event.data.id));
    }

    return sendJson(res, 200, { received: true });
  } catch (error) {
    return handleApiError(res, error);
  }
}

async function verifyWebhook(req: VercelRequest) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error('CLERK_WEBHOOK_SECRET is not configured');
  }

  const payload = await readRawBody(req);
  const svixId = readHeader(req.headers['svix-id']);
  const svixTimestamp = readHeader(req.headers['svix-timestamp']);
  const svixSignature = readHeader(req.headers['svix-signature']);

  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new ApiError(400, 'Missing Clerk webhook headers');
  }

  const headers = {
    'svix-id': svixId,
    'svix-timestamp': svixTimestamp,
    'svix-signature': svixSignature,
  };

  const webhook = new Webhook(secret);
  return webhook.verify(payload, headers) as ClerkWebhookEvent;
}

async function upsertUser(event: ClerkWebhookEvent) {
  if (!event.data.id) {
    return;
  }

  const primaryEmail =
    event.data.email_addresses?.find(
      (email) => email.id === event.data.primary_email_address_id,
    )?.email_address ?? event.data.email_addresses?.[0]?.email_address;

  if (!primaryEmail) {
    return;
  }

  await db
    .insert(users)
    .values({
      id: event.data.id,
      email: primaryEmail,
      firstName: event.data.first_name,
      lastName: event.data.last_name,
      avatarUrl: event.data.image_url,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: primaryEmail,
        firstName: event.data.first_name,
        lastName: event.data.last_name,
        avatarUrl: event.data.image_url,
        updatedAt: new Date(),
      },
    });
}

function readHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function readRawBody(req: VercelRequest) {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString('utf8');
}
