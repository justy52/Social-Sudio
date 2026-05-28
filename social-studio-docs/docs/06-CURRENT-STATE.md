# 06 - Current State

## Phase 1 Status

Phase 1 foundation is complete enough to proceed to controlled Phase 2 implementation.

### Confirmed Working

- Documentation is stored in `social-studio-docs/`.
- Vite + React + TypeScript app runs locally at `http://127.0.0.1:5173`.
- Tailwind CSS and shadcn-style UI primitives are configured.
- React Router routes exist for `/dashboard`, `/posts`, `/calendar`, and `/settings`.
- Clerk login works.
- Protected app routes redirect unauthenticated users.
- Business setup works; a test business can be created locally.
- Neon migration works.
- Phase 1 app tables exist: `users`, `businesses`.
- Root `/api/` Phase 1 routes exist for businesses and Clerk webhook handling.
- Business ownership helpers exist in `src/lib/auth.ts`.
- `GET /api/businesses` filters by authenticated user.
- `POST /api/businesses` assigns `userId` server-side.
- `PUT /api/businesses/[id]` verifies ownership before update.

### Local Development Note

Plain Vite does not serve root `/api/*` serverless functions. A dev-only Vite API adapter is used locally so Phase 1 browser smoke tests can call `/api/businesses` and `/api/webhooks/clerk`.

This does not replace production API routing. Vercel production still uses the root `/api/` serverless functions.

### Placeholder Routes

- `/posts` is a shell route only.
- `/calendar` is a shell route only.

No Phase 2 content workflow has been built yet.

## Phase 2 Status

Phase 2 database foundation has started for the lean image-only content MVP.

Added in the first Phase 2 implementation step:

- `posts` table for draft, review, approved, and exported content records.
- `post_media` table for image records attached to posts.
- Focused status transition helpers for `draft`, `ready_for_review`, `approved`, and `exported`.
- Ownership helper logic for future post/media APIs.

Added in the second Phase 2 implementation step:

- Root `/api/posts` skeleton route for listing and creating draft posts.
- Root `/api/posts/[id]` skeleton route for viewing, updating, and deleting owned posts.
- Strict request validation for post draft fields and Phase 2-only status values.
- Server-side status transition enforcement and server-owned `exported_at` handling.

Added in the third Phase 2 implementation step:

- Root `/api/media/upload` route for image-only uploads linked to owned post drafts.
- Root `/api/media/[key]` route for deleting owned media records and Blob objects.
- Vercel Blob integration using `BLOB_READ_WRITE_TOKEN`.
- JPEG, PNG, and WebP validation with a 10MB MVP file limit.
- `post_media` records are created only after storage upload succeeds.

Added in the fourth Phase 2 implementation step:

- Minimal `/posts` UI for the selected business.
- Draft list with status, caption preview, platform size, dates, and first image preview.
- Create Draft action wired to `POST /api/posts`.
- Detail/edit panel for caption, hashtags, platform size, notes, and valid Phase 2 status transitions.
- Image file input wired to `POST /api/media/upload`.
- Image previews and single-image delete action wired to `DELETE /api/media/[key]`.
- Draft post delete action wired to `DELETE /api/posts/[id]`.

No AI caption route, image editor, export flow, calendar scheduling, publishing, or analytics feature has been built yet.

## Not Yet Built

- No post drafts or post CRUD.
- No AI caption generation.
- No content editor or canvas export.
- No calendar scheduling.
- No email reminders.
- No Meta publishing.
- No cron.
- No Stripe or billing.
- No teams, roles, or client approval accounts.
- No market intelligence or ad features.
- No video, reels, or audio tools.

## Next Controlled Pass

The next pass should be either caption API planning/implementation or a tiny export/manual-post planning pass. Do not do both in the same pass.
