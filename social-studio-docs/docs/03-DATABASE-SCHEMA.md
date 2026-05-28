# 03 — Database Schema

## Database: Neon Postgres + Drizzle ORM

All schema definitions live in `src/lib/db/schema.ts`. Drizzle generates and runs migrations.

---

## Entity Relationship Diagram

```
users ──────────┐
                │ 1:N
                ▼
          businesses ──────────┐
           │                   │ 1:N (Phase 4)
           │ 1:N               ▼
           ▼            social_accounts
         posts
           │
           │ 1:N
           ▼
      post_media
```

---

## Tables

### users

Synced from Clerk via webhook. Clerk manages passwords, sessions, MFA. We store a mirror for foreign key references.

```sql
CREATE TABLE users (
  id            TEXT PRIMARY KEY,          -- Clerk user ID
  email         TEXT NOT NULL UNIQUE,
  first_name    TEXT,
  last_name     TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);
```

### businesses

A user can manage multiple of their own businesses. Each business has brand settings used by the AI caption generator and image editor.

```sql
CREATE TABLE businesses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  logo_url      TEXT,
  primary_color TEXT DEFAULT '#000000',
  accent_color  TEXT DEFAULT '#3B82F6',
  industry      TEXT,
  website_url   TEXT,
  default_hashtags TEXT[],
  brand_voice   TEXT,                        -- AI context: "professional, friendly"
  timezone      TEXT DEFAULT 'America/Denver',
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_businesses_user ON businesses(user_id);
```

### posts

The core content entity. Uses an approval-first workflow.

Current Phase 2 database foundation is leaner than the future-facing example below. The first Phase 2 migration adds only `draft`, `ready_for_review`, `approved`, and `exported` support, with no `scheduled_at`, `published_at`, Meta fields, or failure/publishing statuses. Scheduling starts in Phase 3, and direct publishing starts in Phase 4.

**Status flow:**
```
draft → ready_for_review → approved → scheduled → published
                                    └→ exported (manual posting)
Any status can → failed (on publish error, Phase 4)
```

```sql
CREATE TABLE posts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  status            TEXT NOT NULL DEFAULT 'draft',
                    -- 'draft' | 'ready_for_review' | 'approved' | 'scheduled'
                    -- | 'exported' | 'published' | 'failed'
  caption           TEXT,
  hashtags          TEXT[],
  scheduled_at      TIMESTAMP,
  published_at      TIMESTAMP,
  exported_at       TIMESTAMP,               -- When image was last exported/downloaded
  platform_size     TEXT DEFAULT '1080x1080', -- "1080x1080" | "1080x1350" | "1080x566" | "1200x630"
  notes             TEXT,                     -- Internal notes, not posted
  ai_generated      BOOLEAN DEFAULT false,
  -- Phase 4 fields (nullable until then):
  meta_post_id      TEXT,
  meta_permalink    TEXT,
  target_platforms  TEXT[] DEFAULT '{}',
  target_account_ids UUID[],
  error_message     TEXT,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_posts_business ON posts(business_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_scheduled ON posts(scheduled_at) WHERE status = 'scheduled';
```

### post_media

Images attached to a post. Stored in Vercel Blob.

```sql
CREATE TABLE post_media (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id       UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  blob_url      TEXT NOT NULL,
  blob_key      TEXT NOT NULL,
  mime_type     TEXT DEFAULT 'image/png',
  width         INTEGER,
  height        INTEGER,
  sort_order    INTEGER DEFAULT 0,
  is_edited     BOOLEAN DEFAULT false,       -- Was it processed in the editor?
  original_url  TEXT,                        -- Pre-edit original
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_post_media_post ON post_media(post_id);
```

### social_accounts (Phase 4 — do NOT create until Phase 4)

```sql
CREATE TABLE social_accounts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  platform          TEXT NOT NULL,            -- "instagram" | "facebook"
  platform_user_id  TEXT NOT NULL,
  platform_username TEXT,
  avatar_url        TEXT,
  access_token      TEXT NOT NULL,            -- Encrypted
  token_expires_at  TIMESTAMP,
  page_id           TEXT,
  ig_user_id        TEXT,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);
```

### templates (Phase 5 — do NOT create until Phase 5)

```sql
CREATE TABLE templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  category      TEXT,
  thumbnail_url TEXT,
  canvas_data   JSONB NOT NULL,
  width         INTEGER DEFAULT 1080,
  height        INTEGER DEFAULT 1080,
  is_public     BOOLEAN DEFAULT false,
  created_at    TIMESTAMP DEFAULT NOW()
);
```

---

## Migration Strategy

1. **Phase 1:** Create `users` and `businesses` tables only
2. **Phase 2:** Add `posts` and `post_media` tables
3. **Phase 4:** Add `social_accounts` table
4. **Phase 5:** Add `templates` table

Each phase generates its own migration. Never create tables before the phase that uses them.

```bash
pnpm drizzle-kit generate    # Generate migration from schema changes
pnpm drizzle-kit migrate     # Apply to Neon
pnpm drizzle-kit studio      # Browse database locally
```

Migration files are committed to git in `src/lib/db/migrations/`. Never edit a migration after it has run in production.
