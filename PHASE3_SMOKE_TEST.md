# Phase 3 Smoke Test

Date: 2026-06-07

Result: Passed

Preview deployment:
`https://social-studio-cvb8d8r4n-justinfuchs52-8677s-projects.vercel.app`

Validation method:
- Created a fresh Vercel Preview deployment with `npx vercel --yes`.
- Verified the Preview app loaded through Vercel Automation Bypass without exposing the bypass secret.
- Created a short-lived Clerk session token for authenticated smoke requests.
- Exercised the protected Preview API routes against the real configured services.
- Created temporary smoke posts/media and cleaned them up at the end of the run.
- Did not run `vercel --prod`.

Smoke checks passed:
- Sign-in/authenticated session succeeded.
- Active business workspace loaded.
- Draft post creation worked.
- Image upload to Vercel Blob worked.
- Uploaded image URL downloaded successfully.
- AI caption generation returned caption text.
- Caption and hashtags saved and reloaded.
- Quick Export path moved a draft through review/approval to `exported`.
- A second draft was approved and scheduled.
- Calendar Upcoming included the future scheduled post.
- Calendar Today included a due scheduled post.
- Calendar Export/Re-export moved a scheduled post to `exported`.
- Mark Posted stored `manualPostedAt`.
- Undo Posted restored the scheduled item.
- Dashboard metrics updated for draft, review, approved, and scheduled-this-week counts.
- Dashboard Recent Activity included the latest smoke posts.
- Dashboard Upcoming included the scheduled post.
- Dashboard Open link target included the correct post id.
- Dashboard Export availability was verified for the upcoming scheduled post.

Post-smoke validation:
- `corepack pnpm test:unit` passed, 102 tests.
- `corepack pnpm build` passed.
- Cleanup verification found `0` remaining smoke posts for run id `phase3-smoke-1780852427298`.
