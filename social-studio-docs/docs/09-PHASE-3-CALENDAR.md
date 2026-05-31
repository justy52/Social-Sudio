# 09 - Phase 3: Calendar

**Goal:** Add scheduling, a manual posting queue, and a "ready to post today" view. This gives Social Studio the feel of a real content management tool without the complexity of direct Meta API publishing.

**Depends on:** Phase 2 complete

**Estimated effort:** 1-2 sessions with Claude Code / Codex

**Scope boundary:** This phase adds scheduling UI and a calendar/manual posting queue. It does NOT add direct social publishing or automated cron jobs. Users still export and manually post. Email reminders are optional Phase 3.5+ and should only be built after the core calendar/manual posting workflow is complete.

**Current status:** Phase 3.1 scheduling foundation and Phase 3.2 manual posting queue are implemented and browser-tested in Vercel Preview. The current `/calendar` implementation is a simple queue/list view with `Upcoming`, `Today`, `Past`, and `Exported` tabs. A full drag-and-drop monthly calendar grid is not built yet.

---

## Tasks

### 3.1 - Schedule Posts

**Add scheduling to the post approval flow:**
- After a post is approved, user can choose "Export Now" or "Schedule for Later"
- Schedule picker: date + time dropdown in 30-minute increments
- Time displayed clearly for the user
- Scheduling sets `status: 'scheduled'` and `scheduled_at: datetime`

**Update post form and post detail:**
- Scheduled posts show the date/time with an "Unschedule" action
- Unscheduling returns the post to `approved` status
- Scheduled posts can be exported manually

**Acceptance criteria:**
- [x] Can schedule an approved post for a future date and time
- [x] Scheduled date/time displayed clearly
- [x] Can unschedule a post (returns to approved)
- [x] Cannot schedule a post that has not been approved
- [x] Scheduled posts can be exported

---

### 3.2 - Manual Posting Queue

**Create Calendar page** (`src/pages/calendar.tsx`) as a lean manual posting queue:
- Tabs for `Upcoming`, `Today`, `Past`, and `Exported`
- Scheduled and exported posts grouped by date
- Each queue item shows thumbnail, caption preview, time, status, and actions
- View/Edit Post opens the post in the existing Posts editor
- Copy text copies caption + hashtags for manual posting
- Unschedule is available for scheduled posts
- Export/Re-export downloads the image, copies text, and preserves status rules
- Empty states link back to Posts to create or schedule content

**Acceptance criteria:**
- [x] Queue displays scheduled posts grouped by correct dates
- [x] Upcoming, Today, Past, and Exported filters work
- [x] Clicking View/Edit Post opens the existing post editor
- [x] Today's queue shows what needs to be posted
- [x] Export/Re-export works from queue items
- [x] Copy text and Unschedule actions work
- [x] Responsive list view works on mobile-friendly layouts
- [x] Quick Export in `/posts` still works
- [ ] Full monthly grid navigation
- [ ] Clicking empty day starts a new post with that date

---

### 3.3 - Dashboard Upgrade

**Replace placeholder dashboard with real data:**

Stats cards (top row):
- Drafts in progress
- Posts awaiting review
- Approved & ready to export
- Scheduled this week

Recent activity: last 10 posts with status and date.
Upcoming: next 5 scheduled posts with "Export" shortcut.

**Acceptance criteria:**
- [ ] Dashboard shows real metrics from database
- [ ] Stats update as posts are created/approved/exported
- [ ] Upcoming queue links to post detail

---

## Phase 3 Completion Checklist

- [x] Posts can be scheduled for future dates
- [x] Manual posting queue displays scheduled posts
- [x] Today's queue shows what is due with export/re-export actions
- [ ] Dashboard shows real stats
- [x] Phase 3.1 and 3.2 features work in Vercel Preview
- [x] **Social Studio is now a lean daily content management tool for manual posting**

---

## Task 3.5 - Email Reminders (Optional)

**Build this only after Tasks 3.1-3.3 are complete and working.** It adds value but is not required for the core calendar/manual posting workflow.

**Daily reminder email via Resend (optional Phase 3.5+):**

Create a cron endpoint `GET /api/reminders/cron`:
1. Find all posts with `status = 'scheduled'` and `scheduled_at` = today
2. Group by business
3. Send one email per business to the owner:

```
Subject: You have {count} posts ready for today

Body:
Hi {first_name},

You have {count} posts scheduled for today for {business_name}:

1. "{caption_preview}" - {platform_size}
2. "{caption_preview}" - {platform_size}

Log in to export and post them: {app_url}/calendar

- Social Studio
```

**Configure Vercel Cron** (`vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/reminders/cron",
      "schedule": "0 8 * * *"
    }
  ]
}
```

**Acceptance criteria:**
- [ ] Daily email lists posts scheduled for today
- [ ] Email only sent if there are posts due
- [ ] Email links to the calendar page
- [ ] Cron is protected by secret
- [ ] Works in production on Vercel
