import type { PostSummary } from './client.ts';
import type { PostStatus } from './status.ts';
import { getFinalMediaPreviewUrl, type PostPreviewLike } from './ui.ts';

export type CalendarQueueFilter = 'upcoming' | 'today' | 'past' | 'exported';

export type CalendarQueuePost = PostSummary & {
  scheduledAt: string | null;
};

export type CalendarQueueGroup = {
  dateKey: string;
  label: string;
  posts: CalendarQueuePost[];
};

export function filterCalendarQueuePosts(
  posts: PostSummary[],
  filter: CalendarQueueFilter,
  now = new Date(),
) {
  return posts
    .filter((post): post is CalendarQueuePost => {
      if (filter === 'exported') {
        return post.status === 'exported';
      }

      return post.status === 'scheduled' && Boolean(post.scheduledAt);
    })
    .filter((post) => {
      if (filter === 'exported') {
        return true;
      }

      const scheduledAt = post.scheduledAt;

      if (!scheduledAt) {
        return false;
      }

      const scheduledDate = startOfLocalDay(new Date(scheduledAt));
      const today = startOfLocalDay(now);

      if (filter === 'today') {
        return scheduledDate.getTime() === today.getTime();
      }

      if (filter === 'past') {
        return scheduledDate < today;
      }

      return scheduledDate >= today;
    })
    .sort(compareQueuePosts);
}

export function groupCalendarQueuePosts(
  posts: CalendarQueuePost[],
  timeZone?: string,
) {
  const groups = new Map<string, CalendarQueuePost[]>();

  for (const post of posts) {
    const dateKey = getPostDateKey(post);
    groups.set(dateKey, [...(groups.get(dateKey) ?? []), post]);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([dateKey, groupPosts]) => ({
      dateKey,
      label: formatDateGroupLabel(dateKey, timeZone),
      posts: groupPosts.sort(compareQueuePosts),
    }));
}

export function getQueueThumbnailUrl(post: PostPreviewLike) {
  return getFinalMediaPreviewUrl(post);
}

export function canQueuePostExport(post: { caption: string | null } & PostPreviewLike) {
  return Boolean(post.caption?.trim() && getQueueThumbnailUrl(post));
}

export function buildUnschedulePayload() {
  return {
    status: 'approved' as PostStatus,
    scheduled_at: null,
  };
}

function compareQueuePosts(left: CalendarQueuePost, right: CalendarQueuePost) {
  const leftDate = readQueueSortDate(left);
  const rightDate = readQueueSortDate(right);

  return leftDate.getTime() - rightDate.getTime();
}

function readQueueSortDate(post: CalendarQueuePost) {
  if (post.status === 'exported') {
    return new Date(post.exportedAt ?? post.updatedAt);
  }

  return new Date(post.scheduledAt ?? post.updatedAt);
}

function getPostDateKey(post: CalendarQueuePost) {
  const date = readQueueSortDate(post);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function formatDateGroupLabel(dateKey: string, timeZone?: string) {
  const date = new Date(`${dateKey}T12:00:00`);

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone,
  }).format(date);
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
