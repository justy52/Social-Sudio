# Social Studio

Social Studio is a social media content creation and planning app for small businesses.

Start with the planning docs at [`social-studio-docs/README.md`](social-studio-docs/README.md). Future agents should read [`social-studio-docs/docs/13-AGENT-INSTRUCTIONS.md`](social-studio-docs/docs/13-AGENT-INSTRUCTIONS.md) before making changes.

## Phase 1 Stack

- Vite + React + TypeScript
- Tailwind CSS with shadcn/ui conventions
- React Router
- Clerk authentication
- Vercel serverless functions in `/api`
- Neon Postgres with Drizzle ORM

## Current Status

Phase 1 foundation is complete enough to proceed to controlled Phase 2 implementation.

- Local app runs at `http://127.0.0.1:5173`
- Clerk login and test business creation work locally
- Neon migration is applied with `users` and `businesses` tables
- `/posts` and `/calendar` are placeholders only
- Phase 2 database foundation has started with `posts` and `post_media`
- Phase 2 posts API skeleton exists for draft create/list/view/update/delete
- Phase 2 media upload API exists for image-only Vercel Blob uploads linked to post drafts
- Minimal `/posts` UI exists for draft list/create/edit and image upload preview
- No AI captions, editor, export, scheduling, or publishing features have been built yet

See [`PHASE1_VALIDATION.md`](PHASE1_VALIDATION.md) and [`PHASE2_SCHEMA_PLAN.md`](PHASE2_SCHEMA_PLAN.md).

## Local Setup

1. Install dependencies:

```bash
corepack pnpm install
```

2. Copy `.env.example` to `.env.local` and fill in the Phase 1 values:

```env
DATABASE_URL=
VITE_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
BLOB_READ_WRITE_TOKEN=
```

3. Generate and apply the database migration:

```bash
corepack pnpm db:generate
corepack pnpm db:migrate
```

4. Start the frontend dev server:

```bash
corepack pnpm dev
```

For full local API smoke testing, run the app through Vercel's local dev server so root `/api/*` functions are available:

```bash
npx vercel dev --listen 5173
```

## Deployment Notes

Deploy to Vercel as a Vite app with build command `corepack pnpm build` and output directory `dist`. Add the Phase 1 environment variables above in Vercel. The `vercel.json` rewrite keeps SPA routes working while preserving root `/api/*` serverless functions.

Resend email reminders are optional Phase 3.5+ only. Do not add cron, Stripe, Meta publishing, market intelligence, or ad campaign features during Phase 1.
