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

Phase 3 MVP is complete and validated in Vercel Preview. Social Studio now supports the core create, schedule, queue, export, manual-post, posted-completion, and dashboard workflow.

- Workspace loading works in Preview.
- Draft creation, selection, editing, and persistence work.
- Image upload to Vercel Blob works, and uploaded images persist after refresh.
- Basic image editor save works and creates edited media records.
- AI caption generation works through the server-side OpenAI integration.
- Captions and hashtags save correctly and persist after refresh.
- Quick Export works directly from draft posts for solo workflows.
- Formal review workflow still works: `draft` -> `ready_for_review` -> `approved` -> `exported`.
- Export downloads the final edited image when available, falls back to the original image, copies caption text, and persists the exported state.
- Scheduling works for approved posts, including unscheduling and exporting scheduled posts.
- `/calendar` provides a manual posting queue with `Upcoming`, `Today`, `Past`, and `Exported` tabs.
- The Today queue is a daily checklist with `To Post Today` and `Posted Today` sections.
- Queue items group by date and show thumbnail, caption preview, scheduled/exported time, status, and actions.
- View/Edit Post, Copy text, Unschedule, Export, Re-export, Mark Posted, and Undo posted work from the queue.
- `manual_posted_at` tracks manual posting completion without adding a new post status.
- Scheduled posts marked posted become `exported` and receive server-owned `exportedAt` and `manualPostedAt` timestamps.
- Undo posted restores scheduled items back to Today or Upcoming when `scheduledAt` exists.
- Undo posted on exported unscheduled items clears `manualPostedAt` while keeping status `exported`.
- Posted cards use a subtle completed style with a check badge and visible posted timestamp.
- The manual posting checklist and Undo posted regression fix are validated in browser retest.
- `/dashboard` uses real post data for pipeline metrics, recent activity, and upcoming scheduled posts.
- Direct publishing, cron/email reminders, analytics, billing, teams, ads, video, and templates are still out of scope/not built.

See [`PHASE1_VALIDATION.md`](PHASE1_VALIDATION.md) and [`PHASE2_SCHEMA_PLAN.md`](PHASE2_SCHEMA_PLAN.md).

## Local Setup

1. Install dependencies:

```bash
corepack pnpm install
```

2. Copy `.env.example` to `.env.local` and fill in the required values:

```env
DATABASE_URL=
VITE_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
OPENAI_API_KEY=
BLOB_STORE_ID=
# Optional local/token fallback for Blob uploads:
BLOB_READ_WRITE_TOKEN=
```

For Vercel Preview/Production, connect Vercel Blob and set `BLOB_STORE_ID` so the runtime can use Blob/OIDC access. `BLOB_READ_WRITE_TOKEN` is optional for local or token-based Blob access. `BLOB_WEBHOOK_PUBLIC_KEY` is not required for the current MVP.

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

Deploy to Vercel as a Vite app with build command `corepack pnpm build` and output directory `dist`. Add the required environment variables above in Vercel, including `BLOB_STORE_ID` for connected Blob runtime/OIDC access. The `vercel.json` rewrite keeps SPA routes working while preserving root `/api/*` serverless functions.

Resend email reminders are optional Phase 3.5+ only. Do not add cron, Stripe, Meta publishing, market intelligence, or ad campaign features during Phase 3.
