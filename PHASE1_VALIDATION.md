# Phase 1 Validation Notes

Date: 2026-05-28

## Completion Status

Phase 1 is complete enough to proceed to a narrowly scoped Phase 2 schema/planning pass.

Confirmed manually and by command checks:

- Local app runs at `http://127.0.0.1:5173`.
- Clerk login works.
- Test business creation works.
- Neon migration works.
- Phase 1 app tables exist: `users`, `businesses`.
- `/posts` and `/calendar` remain placeholder routes.
- No Phase 2 features have been built yet.

## Local API Development

Plain Vite does not deploy root `/api/*` functions by itself, and `vercel dev` was hanging in this local environment. A dev-only Vite API adapter is used for local `/api/*` support.

The adapter maps local requests to the existing root API files:

- `/api/businesses` -> `api/businesses/index.ts`
- `/api/businesses/:id` -> `api/businesses/[id].ts`
- `/api/webhooks/clerk` -> `api/webhooks/clerk.ts`

This is only local development support. Production still uses the root `/api/` Vercel serverless route structure.

## Environment

Required for Phase 1:

- `DATABASE_URL`
- `VITE_APP_URL`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`

Optional or later:

- `ANTHROPIC_API_KEY` - Phase 2
- `BLOB_READ_WRITE_TOKEN` - Phase 2
- `RESEND_API_KEY` - optional Phase 3.5+
- `META_APP_ID` and `META_APP_SECRET` - Phase 4 only
- `CRON_SECRET` - optional Phase 3.5+ reminders and Phase 4 publishing
- Stripe, market intelligence, and ad-related keys are not required in current phases.

## Clerk Webhook

For local webhook testing, expose the local app with a tunnel and configure Clerk:

- Local endpoint: `http://127.0.0.1:5173/api/webhooks/clerk`
- Public endpoint format: `https://<your-tunnel-domain>/api/webhooks/clerk`
- Events: `user.created`, `user.updated`, `user.deleted`
- Signing secret goes in `CLERK_WEBHOOK_SECRET`

Local business creation does not depend only on webhook delivery. The Phase 1 business API calls `syncCurrentUserFromClerk()` before listing or creating businesses.

## Ownership Smoke Test

Business API security rules:

- `GET /api/businesses` filters by authenticated `userId`.
- `POST /api/businesses` assigns `userId` server-side.
- `PUT /api/businesses/[id]` calls `requireBusinessOwnership()` before update.

Focused ownership predicate testing confirmed that the owner can match their business and a second user cannot.
