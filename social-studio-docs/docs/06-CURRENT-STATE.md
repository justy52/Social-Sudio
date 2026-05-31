# 06 - Current State

## Phase 1 Status

Phase 1 foundation is complete and supports the Phase 2 content workflow.

### Confirmed Working

- Documentation is stored in `social-studio-docs/`.
- Vite + React + TypeScript app runs locally.
- Tailwind CSS and shadcn-style UI primitives are configured.
- React Router routes exist for `/dashboard`, `/posts`, `/calendar`, and `/settings`.
- Clerk login works.
- Protected app routes redirect unauthenticated users.
- Business setup works.
- Neon migration works.
- Phase 1 app tables exist: `users`, `businesses`.
- Root `/api/` Phase 1 routes exist for businesses and Clerk webhook handling.
- Business ownership helpers exist in `src/lib/auth.ts`.
- `GET /api/businesses` filters by authenticated user.
- `POST /api/businesses` assigns `userId` server-side.
- `PUT /api/businesses/[id]` verifies ownership before update.

### Local Development Note

Plain Vite does not serve root `/api/*` serverless functions by itself. Use the project's Vite API adapter for local API smoke tests, or run through Vercel dev when validating Vercel runtime behavior.

Vercel Blob OIDC upload behavior should be smoke-tested in Vercel Preview. Local Vercel dev may not provide the same OIDC runtime credentials.

## Phase 2 Status

Phase 2 content MVP is implemented and browser-tested in Vercel Preview.

### Implemented

- `posts` table for draft, review, approved, and exported content records.
- `post_media` table for image records attached to posts.
- Root `/api/posts` routes for create, list, view, update, and delete.
- Root `/api/media/upload`, `/api/media/edited`, and `/api/media/[key]` routes for image media.
- Server-side ownership checks through businesses/posts/media.
- Strict request validation for posts, captions, media upload, and status updates.
- Server-side status transition enforcement for `draft`, `ready_for_review`, `approved`, and `exported`.
- Server-owned `exported_at` handling.
- Vercel Blob media storage with public image URLs for previews.
- OpenAI-backed server-side caption generation.
- Basic image editor using the HTML5 Canvas API directly.
- Manual export flow with download, clipboard copy, exported state, and re-export.
- Quick Export flow for solo workflows, while preserving the formal review workflow.

### Preview Validation

The Phase 2 workflow has been validated in Vercel Preview:

- Workspace loads.
- Draft creation and selection work.
- Image upload works.
- Uploaded image persists after refresh.
- Image editor save works.
- AI caption generation works.
- Caption and hashtags save and persist.
- Quick Export works directly from draft posts.
- Formal review workflow still works: `draft` -> `ready_for_review` -> `approved` -> `exported`.
- Exported state persists after refresh.

### Current User Workflow

Solo quick path:

1. Create/select a draft.
2. Upload an image.
3. Optionally save an edited image.
4. Generate or write caption and hashtags.
5. Click `Export Now`.
6. The app downloads the selected image, copies post text, moves the post through valid status transitions, and marks it exported.

Formal review path:

1. Draft content.
2. Move to `ready_for_review`.
3. Approve.
4. Export.

## Phase 3 Status

Phase 3.1 scheduling foundation, Phase 3.2 manual posting queue, and manual posted completion tracking are implemented and browser-tested in Vercel Preview.

### Implemented

- `scheduled` post status.
- Nullable `scheduled_at` / `scheduledAt` on posts.
- Nullable `manual_posted_at` / `manualPostedAt` on posts.
- Server-side schedule, unschedule, and scheduled-export status rules.
- Server-controlled manual posted completion rules using `manual_posted`.
- Scheduling controls in the existing Posts editor for approved posts.
- `/calendar` manual posting queue.
- Queue tabs for `Upcoming`, `Today`, `Past`, and `Exported`.
- Queue items grouped by date.
- Queue item thumbnail, caption preview, scheduled/exported time, status badge, and action controls.
- View/Edit Post action linking back to the existing Posts editor.
- Copy text action for manual posting.
- Unschedule action for scheduled posts.
- Export/Re-export actions from the queue.
- Mark Posted action for scheduled and exported queue items.
- Posted manually completion state with persisted timestamp.
- Undo posted action that clears `manualPostedAt` while keeping status `exported`.

### Preview Validation

The Phase 3 manual posting workflow has been validated in Vercel Preview:

- Workspace loads.
- Scheduled posts appear in the queue.
- Upcoming, Today, Past, and Exported tabs work.
- Queue items group by date.
- Queue thumbnails, caption previews, time labels, status badges, and actions display correctly.
- View/Edit Post, Copy text, Unschedule, Export, and Re-export work.
- Mark Posted works for scheduled and exported queue items.
- Scheduled posts marked posted become `exported` and receive server-owned `exportedAt` and `manualPostedAt`.
- Exported posts can be marked posted without changing status.
- Undo posted clears `manualPostedAt` and keeps status `exported`.
- Posted manually timestamps persist after refresh.
- Quick Export in `/posts` still works.
- Exported state persists after refresh.

### Current User Workflow

Manual posting queue path:

1. Create and approve content in `/posts`.
2. Schedule approved posts for a future date and time.
3. Review due content in `/calendar`.
4. Copy text, export/download the image, and post manually.
5. Mark the scheduled or exported item posted after manually posting.
6. Undo posted if the completion marker was set by mistake.
7. Re-export exported posts if needed without changing ownership or status rules.

## Not Yet Built

- Full drag-and-drop monthly calendar grid.
- Dashboard upgrade with real Phase 3 metrics.
- Email reminders.
- Meta publishing.
- Cron-based auto-publishing.
- Stripe or billing.
- Teams, roles, or client approval accounts.
- Market intelligence or ad features.
- Video, reels, audio, or stories.
- Template library.
- Analytics.

## Next Controlled Pass

Proceed to the next controlled Phase 3 pass, likely dashboard metrics or a small calendar refinement. Keep email reminders, direct publishing, Meta integration, analytics, billing, teams, ads, video, and templates out of scope unless Justin explicitly selects that phase.
