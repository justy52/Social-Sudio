# 13 — Agent Instructions

## For Claude Code, Codex, and other AI coding agents

Read this document FIRST before executing any phase.

---

## Execution Rules

### 1. Sequential phases only
Execute phases in order: 1 → 2 → 3 → 4 → 5. Do NOT skip ahead or build features from a later phase. If you're working on Phase 2 and think "I should add the Meta OAuth flow," STOP. That's Phase 4.

### 2. Audit before building
Before starting Phase 1, run the audit checklist from `06-CURRENT-STATE.md`. Save results as `AUDIT.md`. Do NOT delete or overwrite existing working code without confirmation from Justin.

### 3. One task at a time
Complete tasks sequentially (1.1, 1.2, 1.3...). Verify acceptance criteria before moving to the next task.

### 4. Test after every task
- Verify dev server runs without errors
- Verify TypeScript compiles
- Manually test the feature
- Confirm acceptance criteria are met

### 5. Commit after each task
```bash
git add .
git commit -m "Phase 2.3: Basic image editor with text and logo overlay"
```

### 6. Ask when uncertain
If a decision isn't covered in these docs, stop and ask Justin.

---

## Scope Guardrails — DO NOT BUILD

These features are explicitly out of scope. Do not build them regardless of what seems logical:

- **Video, reels, audio, or story support** — image-only through Phase 5
- **Meta API publishing** — not until Phase 4
- **Cron-based auto-publishing** — not until Phase 4
- **Full drag-and-drop canvas editor** — not until Phase 5 (basic editor only in Phase 2)
- **Fabric.js or Konva** — not until Phase 5 (use HTML5 Canvas API in Phase 2)
- **Template library** — not until Phase 5
- **Analytics or engagement metrics** — not until Phase 5
- **Full white-label / multi-tenant SaaS** — not part of the current build phases. Light business branding only may be added in Phase 5.
- **Team accounts, roles, or permissions** — not in any current phase
- **Stripe billing** — not in any current phase
- **Phase 6: Market Intelligence** — future roadmap only
- **Phase 7: Ad Campaign Assistant** — future roadmap only

---

## Security Rules — MANDATORY

### Business ownership verification
**Every API route that receives a `business_id` MUST verify that the authenticated user owns that business.** Never trust client-supplied `business_id` without a database check.

```typescript
// REQUIRED pattern in every business-scoped API route:
const { userId } = getAuth(req);
if (!userId) return new Response('Unauthorized', { status: 401 });

const [business] = await db.select().from(businesses)
  .where(and(eq(businesses.id, businessId), eq(businesses.userId, userId)));
if (!business) return new Response('Not found', { status: 404 });
```

### API keys are server-side only
Never prefix sensitive keys with `VITE_`. The only client-accessible env var is `VITE_CLERK_PUBLISHABLE_KEY`.

### Post status transitions
Current Phase 3 foundation allows `draft`, `ready_for_review`, `approved`, `scheduled`, and `exported`. Do not add `published`, `failed`, or platform-specific statuses until the relevant later phase.

Enforce valid transitions. Do not allow arbitrary status changes:
- `draft` → `ready_for_review`
- `ready_for_review` → `approved` | `draft`
- `approved` → `scheduled` | `exported` | `draft`
- `scheduled` → `approved` | `exported`

---

## Code Conventions

### File locations
- **API routes:** `/api/` at project root (NOT `/src/api/`)
- **React components:** `/src/components/`
- **Pages:** `/src/pages/`
- **Hooks:** `/src/hooks/`
- **Library code:** `/src/lib/`
- **Types:** `/src/types/`

### Naming
- Components: `PascalCase.tsx` → `PostCard.tsx`
- Hooks: `use-` prefix, kebab-case → `use-posts.ts`
- API routes: kebab-case → `generate.ts`, `auth-url.ts`
- Utilities: camelCase → `utils.ts`

### Component structure
```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface PostCardProps {
  post: Post;
  onDelete: (id: string) => void;
}

export function PostCard({ post, onDelete }: PostCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const handleDelete = async () => { ... };
  return ( ... );
}
```

### Styling
- Tailwind utility classes for all styling
- shadcn/ui components as the base layer
- `cn()` for conditional classes
- No inline styles, no CSS modules
- Mobile-first responsive (`sm:`, `md:`, `lg:`)

### State management
- Server state: TanStack Query
- Client state: React `useState` / `useReducer`
- Global state: React Context (active business, theme)
- No Redux, no Zustand

### Error handling
- API routes: try/catch with HTTP status codes
- Client: TanStack Query error states
- Toast notifications for user-facing errors
- Never show raw error messages to users

---

## Tech-Specific Notes

### Vercel Serverless Functions with Vite
API routes go in `/api/` at project root. Vercel auto-detects them. The `vercel.json` rewrites all non-API routes to `index.html` for SPA routing.

### Drizzle + Neon
Use `@neondatabase/serverless` driver. HTTP-based connection — no persistent pool needed. Each function invocation creates a fresh connection.

### Clerk + Vite
- Frontend: `@clerk/clerk-react` with `VITE_CLERK_PUBLISHABLE_KEY`
- API routes: `@clerk/backend` with `CLERK_SECRET_KEY`

### Image Editor (Phase 2)
Use HTML5 Canvas API directly. Do NOT import Fabric.js or Konva until Phase 5. Draw layers in order: background → overlay → text → logo. Export via `canvas.toBlob()`.

---

## Session Checklist

Before starting:
```
[ ] Read the current phase document
[ ] Check which task is next
[ ] Pull latest from git
[ ] Verify dev server runs
```

After finishing:
```
[ ] Acceptance criteria met for completed tasks
[ ] TypeScript compiles
[ ] Dev server runs
[ ] Code committed with descriptive message
[ ] Pushed to GitHub
```

---

## Project Metadata

- **Owner:** Justin Fuchs (justinfuchs52@gmail.com)
- **Primary use case:** Managing social content for Aloha Fence
- **Secondary use case:** Portfolio project for job applications
- **MVP target:** Phases 1–3 (usable content creation + calendar)
- **Full product:** Phases 1–5 (direct publishing + analytics + polish)
