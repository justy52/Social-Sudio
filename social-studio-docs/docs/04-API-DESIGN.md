# 04 — API Design

## API Overview

All API routes are Vercel Serverless Functions in the `/api/` directory at the **project root** (not `/src/api/`). They run server-side Node.js with access to environment variables the client never sees.

## Security: Mandatory Ownership Check

**Every API route that accepts a `business_id` MUST verify ownership:**

```typescript
import { getAuth } from '@clerk/backend';
import { db } from '../src/lib/db';
import { businesses } from '../src/lib/db/schema';
import { and, eq } from 'drizzle-orm';

async function verifyBusinessOwnership(req: Request, businessId: string) {
  const { userId } = getAuth(req);
  if (!userId) throw new Response('Unauthorized', { status: 401 });

  const [business] = await db.select().from(businesses)
    .where(and(eq(businesses.id, businessId), eq(businesses.userId, userId)));

  if (!business) throw new Response('Not found', { status: 404 });
  return { userId, business };
}
```

**Never trust `business_id` from the client without this check.**

---

## Phase 1 Routes

### `POST /api/webhooks/clerk`
Sync Clerk user events to `users` table. Verify webhook signature.

### `GET /api/businesses`
List businesses for authenticated user.

### `POST /api/businesses`
Create a business for authenticated user.

### `PUT /api/businesses/[id]`
Update business details. Ownership check required.

---

## Phase 2 Routes

Current implementation status: Phase 2 content APIs are implemented and validated in Vercel Preview. Posts CRUD, media upload/delete, edited media upload, OpenAI caption generation, and manual export status updates are working. Scheduling and publishing are not built yet.

### `GET /api/posts?business_id=UUID`
List posts owned by the authenticated user. Optional `business_id` filter must pass ownership verification.

### `POST /api/posts`
Create a new draft post. Body includes `business_id`, `caption`, `hashtags`, `platform_size`, `notes`, and `ai_generated`. Status is server-controlled and defaults to `draft`.

### `GET /api/posts/[id]`
Fetch one owned post and linked `post_media` records. Ownership check required through the post's business.

### `PUT /api/posts/[id]`
Update a post. Can update caption, hashtags, platform size, notes, AI-generated flag, and Phase 2 status. Ownership check required through the post's business. `exported_at` is server-controlled only.

### `DELETE /api/posts/[id]`
Delete a post and cascade linked `post_media` database rows. Ownership check required. Blob object cleanup is deferred to the media upload pass.

### `POST /api/media/upload`
Upload image to Vercel Blob. Body: multipart FormData with `file` (max 4MB, JPEG/PNG/WebP only) and `post_id`. Ownership is verified through the post's business. Returns the created `post_media` record. Vercel Preview uses connected Blob/OIDC runtime credentials; `BLOB_READ_WRITE_TOKEN` remains supported as a fallback.

### `POST /api/media/edited`
Upload the edited PNG rendered by the basic image editor. Body: multipart FormData with `file`, `post_id`, `width`, `height`, and optional `original_url`. Ownership is verified through the post's business. Creates a `post_media` row with `isEdited: true`.

### `DELETE /api/media/[key]`
Delete image from Vercel Blob and the `post_media` record after verifying ownership through `post_media -> posts -> businesses`.

### `POST /api/captions/generate`
Generate AI caption via OpenAI. Server-side only.

```
Body:
{
  business_id: UUID,          // for brand context lookup
  prompt_context: string,     // "New cedar fence installation in Heber City"
  tone: "professional" | "casual" | "funny" | "inspirational",
  include_hashtags: boolean,
  image_description: string   // optional
}

Response:
{
  caption: string,
  hashtags: string[],
  alternatives: string[]      // 2 variations
}
```

**OpenAI prompt structure** (in `src/lib/ai/captions.ts`):
```
System: You are a social media copywriter for {business.name}, a {business.industry} business.
Brand voice: {business.brandVoice || 'professional and approachable'}.
Write a social media caption. Tone: {tone}.
Keep under 2200 characters.
{include_hashtags ? 'Include 5-10 relevant hashtags.' : 'No hashtags.'}
Return ONLY the caption text.

User: Write a caption about: {prompt_context}
{image_description ? 'The image shows: ' + image_description : ''}
```

Model: cost-effective OpenAI text model for short social captions. Max output is kept small and normalized to the existing response shape.

### `GET /api/dashboard/stats?business_id=UUID`
Returns aggregated metrics for the dashboard.

```
Response:
{
  totalDrafts: number,
  totalApproved: number,
  totalScheduled: number,
  totalExported: number,
  recentPosts: Post[],       // last 10
  upcomingPosts: Post[]      // next 5 scheduled
}
```

---

## Phase 3 Routes

No new API routes are required for the core Phase 3 calendar/manual posting workflow. Email reminders are optional Phase 3.5+ and should only be built after that core workflow is complete. If email reminders are implemented:

### `GET /api/reminders/cron`
Daily cron: find posts scheduled for today, send reminder emails via Resend.

---

## Phase 4 Routes (Not MVP — do not build until Phase 4)

### `GET /api/meta/auth-url?business_id=UUID`
Generate Meta OAuth authorization URL.

### `GET /api/meta/callback?code=string&state=string`
OAuth callback. Exchange code for long-lived token. Store accounts in `social_accounts`.

### `GET /api/meta/accounts?business_id=UUID`
List connected Meta accounts.

### `POST /api/publish`
Publish a post to connected Meta accounts.

### `GET /api/publish/cron`
Vercel Cron: publish scheduled posts every 5 minutes. Protected by `CRON_SECRET`.
