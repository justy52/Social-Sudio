# Phase 2 Schema and API Planning Pass

Date: 2026-05-28

## Scope

This is a planning note only. Do not build Phase 2 from this document unless Justin explicitly starts the implementation pass.

Implementation status:

- Phase 2 database foundation has started.
- The first implementation step adds only `posts`, `post_media`, status helpers, ownership helpers, and focused tests.
- The second implementation step adds only the posts API skeleton for create, list, view, update, and delete.
- The third implementation step adds only the media upload/delete API backed by Vercel Blob.
- The fourth implementation step adds only the minimal `/posts` UI for draft list/create/edit and image upload preview.
- No editor, caption generation, export flow, scheduling, or publishing features have been built yet.
- The next implementation step should be either caption API planning/implementation or a tiny export/manual-post planning pass, not both.

Phase 2 target workflow:

```text
business selected -> upload one image -> create post draft -> generate/edit caption -> basic branded edit/export -> mark ready for review -> approve -> export/manual post
```

Keep Phase 2 image-only and export-only. Do not build Meta publishing, scheduled auto-publishing, calendar scheduling, email reminders, billing, team/client roles, market intelligence, ads, advanced analytics, full Canva-style editing, video/reels/audio editing, or story-specific workflows.

## Proposed Tables

### posts

Purpose: core content draft and approval record.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `business_id uuid not null references businesses(id) on delete cascade`
- `status text not null default 'draft'`
- `caption text`
- `hashtags text[] default '{}'`
- `platform_size text not null default '1080x1080'`
- `notes text`
- `ai_generated boolean not null default false`
- `exported_at timestamp with time zone`
- `created_at timestamp with time zone default now() not null`
- `updated_at timestamp with time zone default now() not null`

Indexes:

- `idx_posts_business` on `business_id`
- `idx_posts_status` on `status`
- Optional combined index: `idx_posts_business_status` on `business_id, status`

Status values for Phase 2:

- `draft`
- `ready_for_review`
- `approved`
- `exported`

Reserved for later, but not needed in the first Phase 2 migration:

- `scheduled` - Phase 3
- `published`, `failed` - Phase 4

Recommended Phase 2 status transitions:

- `draft` -> `ready_for_review`
- `ready_for_review` -> `approved`
- `ready_for_review` -> `draft`
- `approved` -> `exported`
- `approved` -> `draft`
- `exported` may be re-exported without changing status

### post_media

Purpose: image records attached to a post, including original and edited/exported image files.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `post_id uuid not null references posts(id) on delete cascade`
- `blob_url text not null`
- `blob_key text not null`
- `mime_type text not null default 'image/png'`
- `width integer`
- `height integer`
- `is_edited boolean not null default false`
- `original_url text`
- `created_at timestamp with time zone default now() not null`
- `updated_at timestamp with time zone default now() not null`

Indexes:

- `idx_post_media_post` on `post_id`

Phase 2 should support one primary uploaded image for the lean MVP. The table allows more media later, but the UI/API should enforce one image in the first implementation pass unless explicitly expanded.

## Relationships

- `businesses 1:n posts`
- `posts 1:n post_media`

Ownership is inherited from `posts.business_id -> businesses.id -> businesses.user_id`.

## Ownership and Security Rules

- Never trust `business_id` from the client without checking ownership.
- Every post list/create route that receives `business_id` must call `requireBusinessOwnership(req, businessId)`.
- Every post update/delete route must first load the post, join or verify the owning business, and confirm the authenticated Clerk user owns that business.
- Every media upload route must verify ownership through `post_id -> posts.business_id -> businesses.user_id` before accepting files.
- Every media delete route must verify ownership through `post_media -> posts -> businesses`.
- Caption generation must fetch business context only after ownership verification.
- Sensitive keys remain server-side only:
  - `ANTHROPIC_API_KEY`
  - `BLOB_READ_WRITE_TOKEN`
  - `DATABASE_URL`
  - `CLERK_SECRET_KEY`

## Proposed API Endpoints

### `GET /api/posts?business_id=UUID&status=string&page=1&limit=20`

List posts for the selected business.

Ownership: verify `business_id` with `requireBusinessOwnership()`.

Notes:

- Status filter is optional.
- Pagination can be simple limit/offset.
- Include first/primary media thumbnail if convenient, but do not overbuild.

### `POST /api/posts`

Create a post draft.

Body:

- `business_id`
- `caption`
- `hashtags`
- `platform_size`
- `notes`
- `status` optional, default `draft`

Ownership: verify `business_id` with `requireBusinessOwnership()`.

Rules:

- Only allow initial statuses `draft` or `ready_for_review`.
- Do not accept `exported`, `scheduled`, `published`, or `failed` on create.

### `GET /api/posts/[id]`

Fetch one post with media.

Ownership: verify through the post's business.

### `PUT /api/posts/[id]`

Update caption, hashtags, notes, platform size, or status.

Ownership: verify through the post's business before update.

Rules:

- Enforce Phase 2 status transitions.
- Do not allow scheduled/published/failed transitions in Phase 2.
- Updating an exported post is allowed only if the app intentionally returns it to `draft` or `approved`; otherwise keep it read/re-export focused.

### `DELETE /api/posts/[id]`

Delete a draft/review/approved/exported post and cascading media DB records.

Ownership: verify through the post's business before delete.

Storage note: delete Blob objects best-effort after ownership check.

### `POST /api/media/upload`

Upload one image for a post or draft flow.

Body: multipart form data.

- `file`
- `post_id`
- optional `is_edited`

Ownership:

- Verify ownership through `post_id -> posts.business_id -> businesses.user_id`.

Rules:

- Accept JPG, PNG, WebP only.
- Max 10 MB.
- Return the created `post_media` record.
- Width and height are nullable until a lightweight dimension reader is added.

### `DELETE /api/media/[key]`

Delete media.

Ownership: verify via `post_media -> posts -> businesses` before deleting the DB record or Blob object.

### `POST /api/captions/generate`

Generate a caption using business brand context.

Body:

- `business_id`
- `prompt_context`
- `tone`
- `include_hashtags`
- `image_description` optional

Ownership: verify `business_id` before loading brand context or calling Claude.

Rules:

- Server-side only.
- Never expose `ANTHROPIC_API_KEY`.
- Return one primary caption and up to two alternatives.

## Proposed UI Scope

Build in Phase 2 implementation, in small steps:

- Posts list at `/posts`
  - Post cards
  - Status badge
  - Filters: all, drafts, review, approved, exported
  - New Post action
- New post page at `/posts/new`
  - Business-aware form
  - Image upload
  - Caption textarea
  - Hashtags input
  - Notes field
  - Save draft
  - Submit for review
- Basic image editor component
  - Size preset
  - Uploaded image preview/canvas
  - One text overlay
  - Logo placement from business settings
  - PNG export
- Caption generator component
  - Prompt context
  - Tone selector
  - Include hashtags checkbox
  - Use generated caption
- Post detail/edit route
  - Review, approve, send back
  - Export/manual posting action

Keep as placeholders in Phase 2:

- `/calendar` remains a shell until Phase 3.
- Any analytics/dashboard metrics beyond simple Phase 2 counts can wait.

Intentionally deferred:

- Meta publishing
- Scheduled publishing
- Calendar scheduling
- Email reminders
- Team/client approvals
- Stripe
- Market intelligence
- Ads
- Advanced editor features
- Video/reels/audio tools

## Migration Plan

Migration name suggestion:

- `0001_phase_2_posts_media`

Tables added:

- `posts`
- `post_media`

Existing tables changed:

- None for the minimal Phase 2 schema.

Low-risk notes:

- Additive migration only.
- Existing Phase 1 data remains untouched.
- Foreign keys cascade from businesses to posts and posts to post_media.
- Do not add `social_accounts`, `templates`, scheduling fields, or Meta fields in this migration.

Rollback notes for local development:

- Drop `post_media` before `posts` if rolling back manually.
- Do not edit a migration after it has been applied to a shared or production database.

## First Implementation Step

Recommended next implementation step: add either caption API planning/implementation or a tiny export/manual-post planning pass. Do not build the editor, scheduling, publishing, analytics, or broad UI in that same pass.
