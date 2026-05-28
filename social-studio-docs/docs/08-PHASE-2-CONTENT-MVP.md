# 08 — Phase 2: Content MVP

**Goal:** Build the core content creation pipeline: create posts, upload and edit images, generate AI captions, approve content, and export ready-to-post images with captions. No direct social publishing yet.

**Depends on:** Phase 1 complete

**Estimated effort:** 3–4 sessions with Claude Code / Codex

**Scope boundary:** This phase is **image-only, export-only**. Do NOT build video support, Meta API publishing, cron jobs, templates library, or analytics.

---

## Tasks

### 2.1 — Post CRUD with Approval Workflow

**Add `posts` and `post_media` tables** to Drizzle schema. Generate and apply migration.

**Create API routes** in `/api/posts/`:
- `GET /api/posts?business_id=UUID&status=string` — list with filtering
- `POST /api/posts` — create draft
- `PUT /api/posts/[id]` — update (status, caption, etc.)
- `DELETE /api/posts/[id]` — delete with media cleanup

**All routes must verify business ownership.**

**Status workflow:**
```
draft                  → User is still working on this
ready_for_review       → Content is complete, needs approval
approved               → Ready to export or schedule
exported               → Image has been downloaded for manual posting
scheduled              → Has a future publish date (Phase 3)
published              → Live on social platform (Phase 4)
failed                 → Publish attempt failed (Phase 4)
```

**Allowed status transitions:**
- `draft` → `ready_for_review`
- `ready_for_review` → `approved` or `draft` (send back for edits)
- `approved` → `exported` or `scheduled`
- `scheduled` → `approved` (unschedule) or `exported`

**Create TanStack Query hooks** (`src/hooks/use-posts.ts`):
```typescript
usePosts(businessId, filters?)
usePost(postId)
useCreatePost()
useUpdatePost()
useDeletePost()
```

**Create Posts List page** (`src/pages/posts/index.tsx`):
- Grid of post cards with thumbnail, caption preview, status badge
- Filter tabs: All | Drafts | Review | Approved | Exported
- "New Post" button → `/posts/new`
- Empty state when no posts exist

**Create Status Badge component** — color-coded: draft (gray), review (yellow), approved (green), exported (blue), scheduled (purple).

**Acceptance criteria:**
- [ ] Posts page shows all posts for active business
- [ ] Can filter by status
- [ ] Can create, edit, and delete posts
- [ ] Posts persist across page refreshes
- [ ] Status transitions enforced (can't skip from draft to exported)

---

### 2.2 — Image Upload & Storage

Current implementation note: media upload/delete API is now present and uses `post_id` ownership verification. Width and height remain nullable until a lightweight dimension reader is added. No media upload UI, editor, caption generation, export flow, scheduling, or publishing has been built yet.

Current UI note: minimal `/posts` UI now supports selected-business draft list/create/edit plus image upload preview and delete. AI captions, image editor, export flow, calendar scheduling, and publishing are still not built.

**Create API routes:**
- `POST /api/media/upload` — accept multipart FormData, validate image files only (JPG/PNG/WebP, max 10MB), upload to Vercel Blob, return URL + key + dimensions
- `DELETE /api/media/[key]` — delete from Blob and `post_media` record

**Create upload hook** (`src/hooks/use-media.ts`).

**Create upload UI in post form:**
- Drag-and-drop zone or click-to-select
- Image preview after upload
- Progress indicator
- Remove button
- Clear error on invalid file type

**Acceptance criteria:**
- [ ] Can upload JPG/PNG/WebP up to 10MB
- [ ] Image preview shown after upload
- [ ] Image stored in Vercel Blob and linked to post
- [ ] Can remove uploaded image
- [ ] Rejects non-image files with clear error

---

### 2.3 — Basic Image Editor

**A focused image editor — NOT a full Canva clone.** Keep this lean for MVP.

**Features to build (in priority order):**

1. **Size presets** — Dropdown to pick output dimensions:
   - 1080×1080 (Instagram square)
   - 1080×1350 (Instagram portrait)
   - 1080×566 (Instagram landscape)
   - 1200×630 (Facebook link preview)

2. **Background image** — Uploaded image fills the canvas. Fit/fill options.

3. **Text overlay** — Single text block with:
   - Editable text content
   - Font size slider
   - Font color picker
   - Bold toggle
   - Position: top / center / bottom (preset positions, not free-drag)
   - Optional background highlight (semi-transparent bar behind text)

4. **Logo overlay** — Auto-place the business logo from brand settings. Position: corner selector (top-left, top-right, bottom-left, bottom-right). Size slider.

5. **Export** — Render canvas to PNG blob at full resolution. Upload the final image to Vercel Blob as the "edited" version linked to the post.

**What NOT to build in this phase:**
- No free-drag positioning (use preset positions)
- No multiple text layers
- No shapes or primitives
- No undo/redo history
- No Fabric.js or Konva (use HTML5 Canvas API directly or a simple `<canvas>` React component)

**Implementation approach:**
Use a `<canvas>` element with a React wrapper. Draw layers in order: background image → color overlay (optional) → text → logo. Export via `canvas.toBlob()`.

**Acceptance criteria:**
- [ ] Can select size preset and canvas resizes
- [ ] Uploaded image displays as background
- [ ] Can add text overlay with customizable size and color
- [ ] Can position text (top/center/bottom)
- [ ] Logo from brand settings appears in selected corner
- [ ] Export produces clean PNG at full resolution
- [ ] Exported image uploads to Vercel Blob and links to post

---

### 2.4 — AI Caption Generator

**Create API route:** `POST /api/captions/generate` — calls Claude API server-side. Fetches business brand context from DB. Returns primary caption + 2 alternatives.

See `04-API-DESIGN.md` for full prompt structure.

**Create Caption Generator UI** (`src/components/posts/caption-generator.tsx`):
- Input: "What is this post about?" (required)
- Tone selector: Professional | Casual | Funny | Inspirational
- "Include hashtags" checkbox
- "Generate" button with loading spinner
- Results: primary caption (editable textarea) + 2 clickable alternatives
- "Use this caption" button → populates post form
- "Regenerate" button

**Acceptance criteria:**
- [ ] Can describe topic and generate caption
- [ ] Caption reflects business brand voice
- [ ] Tone selection changes output
- [ ] Can edit caption before using it
- [ ] Alternatives offered
- [ ] API key never exposed to browser
- [ ] Handles errors gracefully

---

### 2.5 — Export & Manual Posting Flow

This is the **core MVP output**. Users export finished content for manual posting.

**"Export" button on approved posts:**
1. Downloads the final edited image as a PNG file
2. Copies the caption + hashtags to clipboard
3. Updates post status to `exported`
4. Shows a toast: "Image downloaded! Caption copied to clipboard. Ready to post!"

**Post detail view** for exported posts:
- Preview of the final image
- Caption text (with copy button)
- Hashtags (with copy button)
- "Re-export" button
- Timestamp of last export

**Acceptance criteria:**
- [ ] Can export image as downloadable PNG
- [ ] Caption copies to clipboard on export
- [ ] Post status updates to `exported`
- [ ] Can re-export an already-exported post
- [ ] Export works on mobile (download triggers properly)

---

### 2.6 — New Post Page (Full Flow)

Wire everything together on `/posts/new`:

```
┌─────────────────────────────────────────────────────┐
│  New Post                        [Save Draft] [Submit for Review] │
├──────────────┬──────────────────────────────────────┤
│              │                                      │
│  Image       │  Caption & Details                   │
│  Editor      │                                      │
│              │  [Generate Caption ✨]                │
│  (left       │  ┌──────────────────────┐            │
│   panel)     │  │ Caption textarea     │            │
│              │  └──────────────────────┘            │
│  - Upload    │  Hashtags: [tag] [tag] [+]           │
│  - Size      │                                      │
│  - Text      │  Notes: (internal, not posted)       │
│  - Logo      │                                      │
│  - Preview   │  Status: Draft                       │
│              │                                      │
└──────────────┴──────────────────────────────────────┘
```

**Review/Approve flow:**
- "Submit for Review" → status becomes `ready_for_review`
- On the posts list, review posts show an "Approve" or "Send Back" action
- Approved posts show an "Export" button
- This works even when Justin is the only user — the workflow builds the habit

**Acceptance criteria:**
- [ ] Full post creation: upload → edit → caption → save
- [ ] Can save as draft and return later
- [ ] Can submit for review, approve, and export
- [ ] Form validates required fields
- [ ] Post appears in Posts list after creation
- [ ] Responsive: stacks vertically on mobile

---

## Phase 2 Completion Checklist

- [ ] Posts CRUD with approval workflow statuses
- [ ] Image upload to Vercel Blob
- [ ] Basic image editor (size presets, text overlay, logo, export)
- [ ] AI caption generation via Claude API
- [ ] Export flow (download image + copy caption)
- [ ] New Post page combining all features
- [ ] Posts list with status filtering
- [ ] All features work in production
- [ ] **Social Studio is now usable for real content creation**
