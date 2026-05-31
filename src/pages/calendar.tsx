import { useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, CheckCircle2, Copy, ExternalLink, ImagePlus, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useBusinessContext } from '@/context/business-context';
import {
  type CalendarQueueFilter,
  type CalendarQueuePost,
  type TodayQueueSections,
  buildMarkPostedPayload,
  buildUnschedulePayload,
  buildUndoPostedPayload,
  canQueuePostExport,
  filterCalendarQueuePosts,
  getQueueThumbnailUrl,
  getTodayQueueSections,
  groupCalendarQueuePosts,
  isQueuePostManuallyPosted,
} from '@/lib/posts/calendar-queue';
import {
  getPost,
  listPosts,
  updatePost,
} from '@/lib/posts/client';
import {
  applyQuickExportStatusTransitions,
  buildFullPostText,
  copyTextToClipboard,
  downloadImageFromUrl,
  formatHashtagsForPost,
  prepareManualExport,
} from '@/lib/posts/export';
import type { PostStatus } from '@/lib/posts/status';
import { cn } from '@/lib/utils';

const filterLabels: Record<CalendarQueueFilter, string> = {
  upcoming: 'Upcoming',
  today: 'Today',
  past: 'Past',
  exported: 'Exported',
};

const statusLabels: Record<PostStatus, string> = {
  draft: 'Draft',
  ready_for_review: 'Ready for review',
  approved: 'Approved',
  scheduled: 'Scheduled',
  exported: 'Exported',
};

export function CalendarPage() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { activeBusiness } = useBusinessContext();
  const [activeFilter, setActiveFilter] = useState<CalendarQueueFilter>('upcoming');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const postsQuery = useQuery({
    queryKey: ['posts', activeBusiness?.id],
    queryFn: () => listPosts(getToken, activeBusiness?.id ?? ''),
    enabled: Boolean(activeBusiness?.id),
  });
  const posts = postsQuery.data ?? [];
  const filteredPosts = useMemo(
    () => filterCalendarQueuePosts(posts, activeFilter),
    [activeFilter, posts],
  );
  const groups = useMemo(
    () => groupCalendarQueuePosts(filteredPosts, activeBusiness?.timezone),
    [activeBusiness?.timezone, filteredPosts],
  );
  const todaySections = useMemo(() => getTodayQueueSections(posts), [posts]);
  const todayCount = useMemo(
    () => filterCalendarQueuePosts(posts, 'today').length,
    [posts],
  );

  const exportMutation = useMutation({
    mutationFn: async (post: CalendarQueuePost) => {
      const detail = await getPost(getToken, post.id);
      const prepared = prepareManualExport(detail);

      await downloadImageFromUrl(prepared.media.blobUrl, prepared.fileName);
      await copyTextToClipboard(prepared.text);

      const transitionedPost = await applyQuickExportStatusTransitions(
        detail.post.status,
        (status) => updatePost(getToken, detail.post.id, { status }),
      );

      return transitionedPost ?? detail.post;
    },
    onSuccess: async () => {
      setMessage('Image downloaded. Caption copied. Post marked exported.');
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['posts', activeBusiness?.id] });
    },
    onError: (mutationError) => {
      setError(readError(mutationError, 'Could not export post.'));
      setMessage(null);
    },
  });

  const unscheduleMutation = useMutation({
    mutationFn: (post: CalendarQueuePost) => updatePost(getToken, post.id, buildUnschedulePayload()),
    onSuccess: async () => {
      setMessage('Post unscheduled.');
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['posts', activeBusiness?.id] });
    },
    onError: (mutationError) => {
      setError(readError(mutationError, 'Could not unschedule post.'));
      setMessage(null);
    },
  });

  const postedMutation = useMutation({
    mutationFn: (input: { post: CalendarQueuePost; posted: boolean }) =>
      updatePost(
        getToken,
        input.post.id,
        input.posted ? buildMarkPostedPayload() : buildUndoPostedPayload(),
      ),
    onSuccess: async (_post, input) => {
      setMessage(input.posted ? 'Post marked as manually posted.' : 'Posted completion undone.');
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['posts', activeBusiness?.id] });
    },
    onError: (mutationError) => {
      setError(readError(mutationError, 'Could not update posted completion.'));
      setMessage(null);
    },
  });

  const copyMutation = useMutation({
    mutationFn: (text: string) => copyTextToClipboard(text),
    onSuccess: () => {
      setMessage('Post text copied.');
      setError(null);
    },
    onError: (mutationError) => {
      setError(readError(mutationError, 'Could not copy post text.'));
      setMessage(null);
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manual posting queue for {activeBusiness?.name ?? 'your business'}.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={() => void postsQuery.refetch()}
          disabled={postsQuery.isFetching}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </Button>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QueueStat label="Scheduled today" value={todayCount} />
        <QueueStat label="Upcoming" value={filterCalendarQueuePosts(posts, 'upcoming').length} />
        <QueueStat label="Past due" value={filterCalendarQueuePosts(posts, 'past').length} />
        <QueueStat label="Exported" value={filterCalendarQueuePosts(posts, 'exported').length} />
      </section>

      {(message || error) && (
        <div
          className={cn(
            'rounded-md border px-4 py-3 text-sm',
            error
              ? 'border-destructive/30 bg-destructive/10 text-destructive'
              : 'border-primary/20 bg-primary/10 text-primary',
          )}
        >
          {error ?? message}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(Object.keys(filterLabels) as CalendarQueueFilter[]).map((filter) => (
          <Button
            key={filter}
            type="button"
            variant={activeFilter === filter ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter(filter)}
          >
            {filterLabels[filter]}
          </Button>
        ))}
      </div>

      {postsQuery.isLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>Loading queue</CardTitle>
            <CardDescription>Fetching scheduled posts for the selected business.</CardDescription>
          </CardHeader>
        </Card>
      ) : activeFilter === 'today' ? (
        <TodayQueueView
          sections={todaySections}
          timeZone={activeBusiness?.timezone}
          isExporting={exportMutation.isPending}
          isUnscheduling={unscheduleMutation.isPending}
          isCopying={copyMutation.isPending}
          isUpdatingPosted={postedMutation.isPending}
          onExport={(post) => exportMutation.mutate(post)}
          onUnschedule={(post) => unscheduleMutation.mutate(post)}
          onCopy={(post) => copyMutation.mutate(buildFullPostText(post))}
          onMarkPosted={(post) => postedMutation.mutate({ post, posted: true })}
          onUndoPosted={(post) => postedMutation.mutate({ post, posted: false })}
        />
      ) : groups.length === 0 ? (
        <CalendarEmptyState filter={activeFilter} />
      ) : (
        <section className="space-y-5">
          {groups.map((group) => (
            <div key={group.dateKey} className="space-y-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
                <h2 className="text-sm font-semibold uppercase tracking-normal text-muted-foreground">
                  {group.label}
                </h2>
              </div>
              <div className="space-y-3">
                {group.posts.map((post) => (
                  <QueuePostCard
                    key={post.id}
                    post={post}
                    timeZone={activeBusiness?.timezone}
                    isExporting={exportMutation.isPending}
                    isUnscheduling={unscheduleMutation.isPending}
                    isCopying={copyMutation.isPending}
                    isUpdatingPosted={postedMutation.isPending}
                    onExport={() => exportMutation.mutate(post)}
                    onUnschedule={() => unscheduleMutation.mutate(post)}
                    onCopy={() => copyMutation.mutate(buildFullPostText(post))}
                    onMarkPosted={() => postedMutation.mutate({ post, posted: true })}
                    onUndoPosted={() => postedMutation.mutate({ post, posted: false })}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function TodayQueueView({
  sections,
  timeZone,
  isExporting,
  isUnscheduling,
  isCopying,
  isUpdatingPosted,
  onExport,
  onUnschedule,
  onCopy,
  onMarkPosted,
  onUndoPosted,
}: {
  sections: TodayQueueSections;
  timeZone: string | undefined;
  isExporting: boolean;
  isUnscheduling: boolean;
  isCopying: boolean;
  isUpdatingPosted: boolean;
  onExport: (post: CalendarQueuePost) => void;
  onUnschedule: (post: CalendarQueuePost) => void;
  onCopy: (post: CalendarQueuePost) => void;
  onMarkPosted: (post: CalendarQueuePost) => void;
  onUndoPosted: (post: CalendarQueuePost) => void;
}) {
  if (sections.emptyState === 'no-posts') {
    return <TodayEmptyState kind="no-posts" />;
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <QueueStat label="Remaining today" value={sections.remainingCount} />
        <QueueStat label="Posted today" value={sections.postedCount} />
      </div>

      <TodayQueueSection
        title="To Post Today"
        count={sections.remainingCount}
        posts={sections.remaining}
        emptyState={sections.emptyState === 'all-posted' ? <TodayEmptyState kind="all-posted" /> : null}
        timeZone={timeZone}
        isExporting={isExporting}
        isUnscheduling={isUnscheduling}
        isCopying={isCopying}
        isUpdatingPosted={isUpdatingPosted}
        onExport={onExport}
        onUnschedule={onUnschedule}
        onCopy={onCopy}
        onMarkPosted={onMarkPosted}
        onUndoPosted={onUndoPosted}
      />

      {sections.postedCount > 0 && (
        <TodayQueueSection
          title="Posted Today"
          count={sections.postedCount}
          posts={sections.posted}
          emptyState={null}
          timeZone={timeZone}
          isExporting={isExporting}
          isUnscheduling={isUnscheduling}
          isCopying={isCopying}
          isUpdatingPosted={isUpdatingPosted}
          onExport={onExport}
          onUnschedule={onUnschedule}
          onCopy={onCopy}
          onMarkPosted={onMarkPosted}
          onUndoPosted={onUndoPosted}
        />
      )}
    </section>
  );
}

function TodayQueueSection({
  title,
  count,
  posts,
  emptyState,
  timeZone,
  isExporting,
  isUnscheduling,
  isCopying,
  isUpdatingPosted,
  onExport,
  onUnschedule,
  onCopy,
  onMarkPosted,
  onUndoPosted,
}: {
  title: string;
  count: number;
  posts: CalendarQueuePost[];
  emptyState: ReactNode;
  timeZone: string | undefined;
  isExporting: boolean;
  isUnscheduling: boolean;
  isCopying: boolean;
  isUpdatingPosted: boolean;
  onExport: (post: CalendarQueuePost) => void;
  onUnschedule: (post: CalendarQueuePost) => void;
  onCopy: (post: CalendarQueuePost) => void;
  onMarkPosted: (post: CalendarQueuePost) => void;
  onUndoPosted: (post: CalendarQueuePost) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="text-sm font-semibold uppercase tracking-normal text-muted-foreground">
            {title}
          </h2>
        </div>
        <Badge>{count}</Badge>
      </div>

      {posts.length === 0 ? (
        emptyState
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <QueuePostCard
              key={post.id}
              post={post}
              timeZone={timeZone}
              isExporting={isExporting}
              isUnscheduling={isUnscheduling}
              isCopying={isCopying}
              isUpdatingPosted={isUpdatingPosted}
              onExport={() => onExport(post)}
              onUnschedule={() => onUnschedule(post)}
              onCopy={() => onCopy(post)}
              onMarkPosted={() => onMarkPosted(post)}
              onUndoPosted={() => onUndoPosted(post)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TodayEmptyState({ kind }: { kind: 'no-posts' | 'all-posted' }) {
  const isComplete = kind === 'all-posted';

  return (
    <Card className={cn(isComplete && 'border-primary/20 bg-primary/5')}>
      <CardHeader>
        {isComplete ? (
          <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
        ) : (
          <CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" />
        )}
        <CardTitle>{isComplete ? 'All scheduled posts are posted' : 'No posts scheduled today'}</CardTitle>
        <CardDescription>
          {isComplete
            ? 'Everything scheduled for today has been marked posted.'
            : "Schedule approved content from Posts to build today's checklist."}
        </CardDescription>
      </CardHeader>
      {!isComplete && (
        <CardContent>
          <Button type="button" asChild>
            <Link to="/posts">Go to Posts</Link>
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

function QueueStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-4 py-3">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function QueuePostCard({
  post,
  timeZone,
  isExporting,
  isUnscheduling,
  isCopying,
  isUpdatingPosted,
  onExport,
  onUnschedule,
  onCopy,
  onMarkPosted,
  onUndoPosted,
}: {
  post: CalendarQueuePost;
  timeZone: string | undefined;
  isExporting: boolean;
  isUnscheduling: boolean;
  isCopying: boolean;
  isUpdatingPosted: boolean;
  onExport: () => void;
  onUnschedule: () => void;
  onCopy: () => void;
  onMarkPosted: () => void;
  onUndoPosted: () => void;
}) {
  const thumbnailUrl = getQueueThumbnailUrl(post);
  const hashtags = formatHashtagsForPost(post.hashtags);
  const canExport = canQueuePostExport(post);
  const isPosted = isQueuePostManuallyPosted(post);

  return (
    <Card className={cn(isPosted && 'border-border bg-muted/40')}>
      <CardContent className="grid gap-4 p-4 sm:grid-cols-[96px_minmax(0,1fr)]">
        <div
          className={cn(
            'flex aspect-square items-center justify-center overflow-hidden rounded-md border border-border bg-muted',
            isPosted && 'opacity-80',
          )}
        >
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{statusLabels[post.status]}</Badge>
            <span className="text-sm text-muted-foreground">
              {post.status === 'exported'
                ? post.exportedAt
                  ? `Exported ${formatDateTime(post.exportedAt, timeZone)}`
                  : 'Exported'
                : post.scheduledAt
                  ? formatDateTime(post.scheduledAt, timeZone)
                  : 'No scheduled time'}
            </span>
            <span className="text-xs text-muted-foreground">{post.platformSize}</span>
            {isPosted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                Posted manually
              </span>
            )}
          </div>

          {post.manualPostedAt && (
            <p className="text-xs text-muted-foreground">
              Posted manually {formatDateTime(post.manualPostedAt, timeZone)}
            </p>
          )}

          <div>
            <p className={cn('line-clamp-2 text-sm font-medium', isPosted && 'text-muted-foreground')}>
              {post.caption || 'No caption yet'}
            </p>
            {hashtags && (
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{hashtags}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" asChild>
              <Link to={`/posts?post_id=${post.id}`}>
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                View/Edit Post
              </Link>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onExport}
              disabled={isExporting || !canExport}
              title={canExport ? undefined : 'Add an image and caption before exporting.'}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {post.status === 'exported' ? 'Re-export' : 'Export'}
            </Button>
            {post.status === 'scheduled' && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onUnschedule}
                disabled={isUnscheduling}
              >
                Unschedule
              </Button>
            )}
            {isPosted ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onUndoPosted}
                disabled={isUpdatingPosted}
              >
                Undo posted
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onMarkPosted}
                disabled={isUpdatingPosted}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Mark Posted
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onCopy}
              disabled={isCopying || !buildFullPostText(post)}
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copy text
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CalendarEmptyState({ filter }: { filter: CalendarQueueFilter }) {
  const label = filter === 'exported' ? 'exported posts' : `${filter} scheduled posts`;

  return (
    <Card>
      <CardHeader>
        <CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" />
        <CardTitle>No {label} yet</CardTitle>
        <CardDescription>
          Schedule content from the Posts editor, then use this queue to export and manually post.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" asChild>
          <Link to="/posts">Go to Posts</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function formatDateTime(value: string, timeZone?: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
    timeZoneName: timeZone ? 'short' : undefined,
  }).format(new Date(value));
}

function readError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
