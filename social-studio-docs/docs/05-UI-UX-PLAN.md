# 05 — UI/UX Plan and App Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    CLOUDFLARE                        │
│                 DNS + CDN + SSL                      │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│                     VERCEL                           │
│  ┌──────────────────┐  ┌─────────────────────────┐  │
│  │   React SPA       │  │  Serverless Functions   │  │
│  │   (Vite build)    │  │  /api/*                 │  │
│  │                    │  │                         │  │
│  │  - Pages/Routes    │  │  - /api/posts           │  │
│  │  - Components      │  │  - /api/captions        │  │
│  │  - Image Editor    │  │  - /api/media           │  │
│  │  - Calendar UI     │  │  - /api/businesses      │  │
│  │  - Dashboard       │  │  - /api/webhooks/clerk  │  │
│  └──────────────────┘  └──────────┬──────────────┘  │
│                                    │                 │
│  ┌─────────────────────────────────┘                 │
│  │  Vercel Blob (image storage)                      │
│  └───────────────────────────────────────────────────┘
└──────────────────────────────────────────────────────┘
         │                    │
    ┌────▼────┐        ┌─────▼─────┐
    │  Neon   │        │ Anthropic │
    │Postgres │        │ Claude API│
    └─────────┘        └───────────┘

Phase 4 adds:
    ┌─────────────┐
    │  Meta Graph  │
    │     API      │
    └──────────────┘
```

## Folder Structure

```
social-studio/
├── api/                            # Vercel serverless functions (PROJECT ROOT)
│   ├── posts/
│   │   ├── index.ts                # GET (list), POST (create)
│   │   └── [id].ts                 # GET, PUT, DELETE single post
│   ├── captions/
│   │   └── generate.ts             # POST — Claude API call
│   ├── media/
│   │   ├── upload.ts               # POST — upload to Vercel Blob
│   │   └── [key].ts                # DELETE — remove from Blob
│   ├── businesses/
│   │   ├── index.ts                # GET (list), POST (create)
│   │   └── [id].ts                 # GET, PUT single business
│   ├── dashboard/
│   │   └── stats.ts                # GET — dashboard metrics
│   └── webhooks/
│       └── clerk.ts                # POST — user sync webhook
├── src/                            # React application
│   ├── components/
│   │   ├── ui/                     # shadcn/ui primitives (auto-generated)
│   │   ├── layout/
│   │   │   ├── app-shell.tsx       # Main layout wrapper
│   │   │   ├── sidebar.tsx         # Navigation sidebar
│   │   │   ├── header.tsx          # Top bar with business selector
│   │   │   └── mobile-nav.tsx      # Responsive navigation
│   │   ├── editor/
│   │   │   ├── image-editor.tsx    # Image + text overlay editor
│   │   │   ├── text-overlay.tsx    # Text layer controls
│   │   │   ├── logo-overlay.tsx    # Brand logo placement
│   │   │   ├── size-picker.tsx     # Square/portrait/landscape presets
│   │   │   └── export-button.tsx   # Canvas → image export
│   │   ├── posts/
│   │   │   ├── post-card.tsx       # Single post preview
│   │   │   ├── post-list.tsx       # Grid/list of posts
│   │   │   ├── post-form.tsx       # Create/edit post form
│   │   │   ├── caption-generator.tsx # AI caption UI
│   │   │   └── status-badge.tsx    # Color-coded status indicator
│   │   ├── calendar/               # Phase 3
│   │   │   ├── schedule-view.tsx
│   │   │   └── day-cell.tsx
│   │   └── dashboard/
│   │       ├── stats-cards.tsx
│   │       ├── recent-posts.tsx
│   │       └── upcoming-posts.tsx
│   ├── hooks/
│   │   ├── use-posts.ts            # TanStack Query hooks for posts
│   │   ├── use-businesses.ts       # Business CRUD hooks
│   │   ├── use-captions.ts         # AI caption generation hook
│   │   └── use-media.ts            # Image upload hook
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts           # Drizzle schema definitions
│   │   │   ├── migrations/         # SQL migration files
│   │   │   └── index.ts            # DB connection singleton
│   │   ├── ai/
│   │   │   └── captions.ts         # Claude API prompt + call
│   │   ├── storage/
│   │   │   └── blob.ts             # Vercel Blob upload helpers
│   │   ├── auth.ts                 # Clerk helpers, ownership verification
│   │   └── utils.ts                # cn(), formatDate(), etc.
│   ├── pages/
│   │   ├── dashboard.tsx
│   │   ├── posts/
│   │   │   ├── index.tsx            # All posts list
│   │   │   ├── new.tsx              # Create new post
│   │   │   └── [id]/
│   │   │       └── edit.tsx         # Edit existing post
│   │   ├── calendar.tsx             # Phase 3
│   │   ├── settings.tsx
│   │   └── sign-in.tsx
│   ├── context/
│   │   └── business-context.tsx     # Active business state
│   ├── types/
│   │   └── index.ts
│   ├── styles/
│   │   └── globals.css
│   ├── App.tsx
│   └── main.tsx
├── drizzle.config.ts
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
├── vercel.json
├── .env.local                       # Git-ignored
├── .env.example                     # Committed template
├── .eslintrc.cjs
├── .prettierrc
├── package.json
└── pnpm-lock.yaml
```

**IMPORTANT:** API routes live in `/api/` at the project root, NOT inside `/src/`. This is how Vercel detects and deploys serverless functions for a Vite app. Do not put API routes inside `/src/api/`.

## Data Flow: MVP Post Creation (Phases 1–2)

```
1. User opens /posts/new
2. User uploads an image → Vercel Blob
3. User edits image (add text overlay, logo, resize) in ImageEditor
4. User clicks "Generate Caption" → /api/captions/generate → Claude API
5. User reviews/edits caption in PostForm
6. User clicks "Save Draft"
   └── POST /api/posts (saves to Neon, status: "draft")
7. User reviews post and clicks "Approve"
   └── PUT /api/posts/:id (status: "approved")
8. User clicks "Export"
   └── Downloads final image + caption to clipboard/file
9. User manually posts to Instagram/Facebook
```

## Data Flow: Scheduled Publishing (Phase 3)

```
Steps 1–7 same as above, then:
8. User sets a publish date/time and clicks "Schedule"
   └── PUT /api/posts/:id (status: "scheduled", scheduled_at: datetime)
9. App shows post in calendar view on that date
10. On the scheduled date, user may get an email reminder if optional Phase 3.5+ reminders are implemented
11. User opens the post, exports, and manually publishes
```

## Data Flow: Direct Publishing (Phase 4 — not MVP)

```
Steps 1–7 same as above, then:
8. User selects target accounts and clicks "Publish Now" or "Schedule"
9. /api/publish handles Meta Graph API posting
10. Status updates to "published" with Meta permalink
```

## Security Rules

**Critical — applies to ALL API routes from Phase 1 onward:**

1. **Never trust `business_id` from the client.** Every API route must verify that the authenticated Clerk user owns the requested business before reading or writing any data.

2. **Implementation pattern:**
```typescript
// In every API route that takes business_id
const { userId } = getAuth(req);
const business = await db.select().from(businesses)
  .where(and(
    eq(businesses.id, businessId),
    eq(businesses.userId, userId)  // ← ownership check
  ));
if (!business) return new Response('Not found', { status: 404 });
```

3. **API keys are server-side only.** No `ANTHROPIC_API_KEY`, `CLERK_SECRET_KEY`, `META_APP_SECRET`, or `DATABASE_URL` should ever be prefixed with `VITE_` or exposed to the browser. Only `VITE_CLERK_PUBLISHABLE_KEY` is client-accessible.

## Key Design Decisions

**Why `/api/` at project root instead of `/src/api/`?**
Vercel auto-detects serverless functions from the `/api/` directory at the project root. Putting them in `/src/api/` would require extra rewrites config and is not the standard pattern for Vite + Vercel.

**Why not Next.js?**
Justin's existing build is Vite + React. Vite is simpler, has less "magic" to debug, and serverless functions via the `/api/` directory still work on Vercel. Can migrate to Next.js later if SSR/SEO is needed.

**Why Drizzle over Prisma?**
Lighter weight, faster cold starts in serverless, SQL-like syntax, and excellent TypeScript inference. Better fit for Neon's serverless driver.

**Why export/download before Meta publishing?**
Meta API integration requires OAuth, app review, token management, cron jobs, and public image hosting. That's weeks of complexity. Export/download gives a usable product immediately while Meta publishing is built separately.
