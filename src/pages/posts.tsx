import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  Bot,
  CalendarClock,
  CheckCircle2,
  Copy,
  Download,
  ImagePlus,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { CaptionGenerator } from '@/components/posts/caption-generator';
import { ImageEditor } from '@/components/posts/image-editor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useBusinessContext } from '@/context/business-context';
import {
  createDraftPost,
  deletePost,
  deletePostImage,
  getPost,
  listPosts,
  type PostArchiveFilter,
  type PostDetail,
  type PostMediaRecord,
  type PostSummary,
  updatePost,
  uploadPostImage,
} from '@/lib/posts/client';
import type { CaptionGeneratorSelection } from '@/lib/posts/captions-ui';
import {
  buildFullPostText,
  canExportPost,
  copyTextToClipboard,
  downloadImageFromUrl,
  formatHashtagsForPost,
  applyQuickExportStatusTransitions,
  prepareManualExport,
  selectExportMedia,
} from '@/lib/posts/export';
import { getFirstOriginalMedia } from '@/lib/posts/image-editor';
import type { PostStatus } from '@/lib/posts/status';
import {
  formatHashtagsInput,
  getAvailableStatusOptions,
  getFirstMediaPreviewUrl,
  parseHashtagsInput,
  validateClientImageFile,
} from '@/lib/posts/ui';
import { toUserFacingError } from '@/lib/user-facing-error';
import { cn } from '@/lib/utils';

type PostFormState = {
  caption: string;
  hashtags: string;
  platformSize: string;
  notes: string;
  status: PostStatus;
  aiGenerated: boolean;
};

const platformSizes = ['1080x1080', '1080x1350', '1080x566', '1200x630'];

const statusLabels: Record<PostStatus, string> = {
  draft: 'Draft',
  ready_for_review: 'Ready for review',
  approved: 'Approved',
  scheduled: 'Scheduled',
  exported: 'Exported',
};

const statusStyles: Record<PostStatus, string> = {
  draft: 'border-slate-400/25 bg-slate-400/10 text-slate-200',
  ready_for_review: 'border-amber-300/30 bg-amber-400/10 text-amber-200',
  approved: 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200',
  scheduled: 'border-cyan-300/30 bg-cyan-400/10 text-cyan-200',
  exported: 'border-primary/35 bg-primary/15 text-primary',
};

const emptyForm: PostFormState = {
  caption: '',
  hashtags: '',
  platformSize: '1080x1080',
  notes: '',
  status: 'draft',
  aiGenerated: false,
};

const archiveFilters: { value: PostArchiveFilter; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All' },
];

export function PostsPage() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { activeBusiness } = useBusinessContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [archiveFilter, setArchiveFilter] = useState<PostArchiveFilter>('active');
  const [form, setForm] = useState<PostFormState>(emptyForm);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedPostId(null);
    setArchiveFilter('active');
    setMessage(null);
    setError(null);
  }, [activeBusiness?.id]);

  useEffect(() => {
    const postId = searchParams.get('post_id');

    if (postId) {
      setSelectedPostId(postId);
    }
  }, [searchParams]);

  const postsQuery = useQuery({
    queryKey: ['posts', activeBusiness?.id, archiveFilter],
    queryFn: () => listPosts(getToken, activeBusiness?.id ?? '', archiveFilter),
    enabled: Boolean(activeBusiness?.id),
  });

  const detailQuery = useQuery({
    queryKey: ['post', selectedPostId],
    queryFn: () => getPost(getToken, selectedPostId ?? ''),
    enabled: Boolean(selectedPostId),
  });

  useEffect(() => {
    const detail = detailQuery.data;

    if (!detail) {
      setForm(emptyForm);
      return;
    }

    setForm({
      caption: detail.post.caption ?? '',
      hashtags: formatHashtagsInput(detail.post.hashtags),
      platformSize: detail.post.platformSize,
      notes: detail.post.notes ?? '',
      status: detail.post.status,
      aiGenerated: detail.post.aiGenerated,
    });
    const scheduleParts = detail.post.scheduledAt
      ? getLocalDateTimeParts(detail.post.scheduledAt)
      : getDefaultScheduleParts();
    setScheduleDate(scheduleParts.date);
    setScheduleTime(scheduleParts.time);
  }, [detailQuery.data]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!activeBusiness) {
        throw new Error('Select a business before creating posts.');
      }

      return createDraftPost(getToken, activeBusiness.id);
    },
    onSuccess: async (post) => {
      setSelectedPostId(post.id);
      setMessage('Draft created.');
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['posts', activeBusiness?.id] });
    },
    onError: (mutationError) => {
      setError(readError(mutationError, 'Could not create draft.'));
      setMessage(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPostId) {
        throw new Error('Select a post before saving.');
      }

      return updatePost(getToken, selectedPostId, {
        caption: form.caption,
        hashtags: parseHashtagsInput(form.hashtags),
        platform_size: form.platformSize,
        notes: form.notes,
        ai_generated: form.aiGenerated,
        status: form.status,
      });
    },
    onSuccess: async () => {
      setMessage('Post saved.');
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['posts', activeBusiness?.id] }),
        queryClient.invalidateQueries({ queryKey: ['post', selectedPostId] }),
      ]);
    },
    onError: (mutationError) => {
      setError(readError(mutationError, 'Could not save post.'));
      setMessage(null);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      if (!selectedPostId) {
        throw new Error('Select a post before uploading images.');
      }

      for (const file of files) {
        validateClientImageFile(file);
      }

      for (const file of files) {
        await uploadPostImage(getToken, selectedPostId, file);
      }
    },
    onSuccess: async () => {
      setMessage('Image uploaded.');
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['posts', activeBusiness?.id] }),
        queryClient.invalidateQueries({ queryKey: ['post', selectedPostId] }),
      ]);
    },
    onError: (mutationError) => {
      setError(readError(mutationError, 'Could not upload image.'));
      setMessage(null);
    },
  });

  const deleteMediaMutation = useMutation({
    mutationFn: (media: PostMediaRecord) => deletePostImage(getToken, media.blobKey),
    onSuccess: async () => {
      setMessage('Image deleted.');
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['posts', activeBusiness?.id] }),
        queryClient.invalidateQueries({ queryKey: ['post', selectedPostId] }),
      ]);
    },
    onError: (mutationError) => {
      setError(readError(mutationError, 'Could not delete image.'));
      setMessage(null);
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPostId) {
        throw new Error('Select a post before deleting.');
      }

      await deletePost(getToken, selectedPostId);
    },
    onSuccess: async () => {
      setSelectedPostId(null);
      setSearchParams({});
      setMessage('Post permanently deleted.');
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['posts', activeBusiness?.id] });
    },
    onError: (mutationError) => {
      setError(readError(mutationError, 'Could not delete post.'));
      setMessage(null);
    },
  });

  const archivePostMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPostId) {
        throw new Error('Select a post before archiving.');
      }

      return updatePost(getToken, selectedPostId, { archived: true });
    },
    onSuccess: async () => {
      setSelectedPostId(null);
      setSearchParams({});
      setMessage('Post archived.');
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['posts', activeBusiness?.id] });
    },
    onError: (mutationError) => {
      setError(readError(mutationError, 'Could not archive post.'));
      setMessage(null);
    },
  });

  const restorePostMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPostId) {
        throw new Error('Select a post before restoring.');
      }

      return updatePost(getToken, selectedPostId, { archived: false });
    },
    onSuccess: async (post) => {
      setArchiveFilter('active');
      setSelectedPostId(post.id);
      setSearchParams({ post_id: post.id });
      setMessage('Post restored.');
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['posts', activeBusiness?.id] }),
        queryClient.invalidateQueries({ queryKey: ['post', post.id] }),
      ]);
    },
    onError: (mutationError) => {
      setError(readError(mutationError, 'Could not restore post.'));
      setMessage(null);
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDetail) {
        throw new Error('Select a post before exporting.');
      }

      const hashtags = parseHashtagsInput(form.hashtags);
      const exportDetail: PostDetail = {
        post: {
          ...selectedDetail.post,
          caption: form.caption,
          hashtags,
          platformSize: form.platformSize,
        },
        media: selectedDetail.media,
      };
      const prepared = prepareManualExport(exportDetail);

      await downloadImageFromUrl(prepared.media.blobUrl, prepared.fileName);
      await copyTextToClipboard(prepared.text);

      const baseUpdate = {
        caption: form.caption,
        hashtags,
        platform_size: form.platformSize,
        notes: form.notes,
        ai_generated: form.aiGenerated,
      };
      let updatedPost = selectedDetail.post;
      const transitionedPost = await applyQuickExportStatusTransitions(
        selectedDetail.post.status,
        (status) =>
          updatePost(getToken, selectedDetail.post.id, {
            ...baseUpdate,
            status,
          }),
      );

      if (transitionedPost) {
        updatedPost = transitionedPost;
      } else {
        updatedPost = await updatePost(getToken, selectedDetail.post.id, baseUpdate);
      }

      return updatedPost;
    },
    onSuccess: async () => {
      setMessage('Image downloaded. Caption copied. Post marked exported.');
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['posts', activeBusiness?.id] }),
        queryClient.invalidateQueries({ queryKey: ['post', selectedPostId] }),
      ]);
    },
    onError: (mutationError) => {
      setError(readError(mutationError, 'Could not export post.'));
      setMessage(null);
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDetail) {
        throw new Error('Select a post before scheduling.');
      }

      const scheduledAt = buildScheduledAtIso(scheduleDate, scheduleTime);

      return updatePost(getToken, selectedDetail.post.id, {
        caption: form.caption,
        hashtags: parseHashtagsInput(form.hashtags),
        platform_size: form.platformSize,
        notes: form.notes,
        ai_generated: form.aiGenerated,
        status: 'scheduled',
        scheduled_at: scheduledAt,
      });
    },
    onSuccess: async () => {
      setMessage('Post scheduled.');
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['posts', activeBusiness?.id] }),
        queryClient.invalidateQueries({ queryKey: ['post', selectedPostId] }),
      ]);
    },
    onError: (mutationError) => {
      setError(readError(mutationError, 'Could not schedule post.'));
      setMessage(null);
    },
  });

  const unscheduleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDetail) {
        throw new Error('Select a post before unscheduling.');
      }

      return updatePost(getToken, selectedDetail.post.id, {
        caption: form.caption,
        hashtags: parseHashtagsInput(form.hashtags),
        platform_size: form.platformSize,
        notes: form.notes,
        ai_generated: form.aiGenerated,
        status: 'approved',
        scheduled_at: null,
      });
    },
    onSuccess: async () => {
      setMessage('Post unscheduled.');
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['posts', activeBusiness?.id] }),
        queryClient.invalidateQueries({ queryKey: ['post', selectedPostId] }),
      ]);
    },
    onError: (mutationError) => {
      setError(readError(mutationError, 'Could not unschedule post.'));
      setMessage(null);
    },
  });

  const selectedDetail = detailQuery.data;
  const statusOptions = useMemo(
    () => (selectedDetail ? getAvailableStatusOptions(selectedDetail.post.status) : []),
    [selectedDetail],
  );

  const posts = postsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-lg border border-primary/15 bg-card/60 p-5 shadow-[0_22px_70px_rgba(2,6,23,0.36)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(139,92,246,0.18),transparent_34%),radial-gradient(circle_at_86%_18%,rgba(34,211,238,0.13),transparent_36%)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-md border border-primary/30 bg-primary/10 shadow-[0_0_30px_rgba(56,189,248,0.2)]">
              <Bot className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">Posts</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Draft posts and image uploads for {activeBusiness?.name ?? 'your business'}.
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={!activeBusiness || createMutation.isPending}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {createMutation.isPending ? 'Creating' : 'Create Draft'}
          </Button>
        </div>
      </header>

      <section className="rounded-md border border-border/60 bg-card/45 px-4 py-3 shadow-[0_12px_38px_rgba(2,6,23,0.2)] backdrop-blur-xl">
        <p className="text-sm font-medium text-foreground">{activeBusiness?.name}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {activeBusiness?.industry ?? 'No industry set'} /{' '}
          {activeBusiness?.brandVoice ?? 'No brand voice set'}
        </p>
      </section>

      {(message || error) && (
        <div
          role={error ? 'alert' : 'status'}
          aria-live="polite"
          className={cn(
            'rounded-md border px-4 py-3 text-sm shadow-[0_0_28px_rgba(56,189,248,0.08)] backdrop-blur-xl',
            error
              ? 'border-destructive/30 bg-destructive/10 text-destructive'
              : 'border-primary/20 bg-primary/10 text-primary',
          )}
        >
          {error ?? message}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)]">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-card/45 px-3 py-2 shadow-[0_12px_38px_rgba(2,6,23,0.2)] backdrop-blur-xl">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary/10 shadow-[0_0_22px_rgba(56,189,248,0.12)]">
                <Pencil className="h-4 w-4 text-primary" aria-hidden="true" />
              </span>
              <h2 className="truncate text-sm font-semibold uppercase tracking-normal text-foreground">
                Draft workspace
              </h2>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="flex rounded-md border border-border/60 bg-secondary/35 p-1">
                {archiveFilters.map((filter) => (
                  <Button
                    key={filter.value}
                    type="button"
                    variant={archiveFilter === filter.value ? 'default' : 'ghost'}
                    size="sm"
                    aria-pressed={archiveFilter === filter.value}
                    onClick={() => {
                      setArchiveFilter(filter.value);
                      setSelectedPostId(null);
                      setSearchParams({});
                    }}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void postsQuery.refetch()}
                disabled={postsQuery.isFetching}
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Refresh
              </Button>
            </div>
          </div>

          {postsQuery.isLoading ? (
            <Card className="overflow-hidden border-primary/15 bg-card/65" aria-busy="true">
              <CardHeader>
                <CardTitle>Loading posts</CardTitle>
                <CardDescription>Fetching drafts for the selected business.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="h-2 rounded-full bg-primary/15 motion-safe:animate-pulse" />
                <div className="h-2 w-2/3 rounded-full bg-violet-300/15 motion-safe:animate-pulse" />
              </CardContent>
            </Card>
          ) : posts.length === 0 ? (
            <Card className="border-dashed border-primary/25 bg-card/55">
              <CardHeader>
                {archiveFilter === 'archived' ? (
                  <Archive className="h-5 w-5 text-primary" aria-hidden="true" />
                ) : (
                  <ImagePlus className="h-5 w-5 text-primary" aria-hidden="true" />
                )}
                <CardTitle>
                  {archiveFilter === 'archived' ? 'No archived posts' : 'No posts yet'}
                </CardTitle>
                <CardDescription>
                  {archiveFilter === 'archived'
                    ? 'Archived posts will appear here when you clean up active work.'
                    : 'Create a draft to start testing the image workflow.'}
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            posts.map((post) => (
              <PostListCard
                key={post.id}
                post={post}
                isSelected={post.id === selectedPostId}
                onSelect={() => {
                  setSelectedPostId(post.id);
                  setSearchParams({ post_id: post.id });
                }}
              />
            ))
          )}
        </section>

        <PostEditor
          detail={selectedDetail}
          businessId={activeBusiness?.id}
          getToken={getToken}
          businessLogoUrl={activeBusiness?.logoUrl}
          form={form}
          statusOptions={statusOptions}
          isLoading={detailQuery.isLoading}
          isSaving={updateMutation.isPending}
          isUploading={uploadMutation.isPending}
          isDeletingPost={deletePostMutation.isPending}
          isArchivingPost={archivePostMutation.isPending}
          isRestoringPost={restorePostMutation.isPending}
          isDeletingMedia={deleteMediaMutation.isPending}
          isExporting={exportMutation.isPending}
          isScheduling={scheduleMutation.isPending}
          isUnscheduling={unscheduleMutation.isPending}
          scheduleDate={scheduleDate}
          scheduleTime={scheduleTime}
          businessTimezone={activeBusiness?.timezone}
          onChange={setForm}
          onScheduleDateChange={setScheduleDate}
          onScheduleTimeChange={setScheduleTime}
          onSave={() => updateMutation.mutate()}
          onExport={() => exportMutation.mutate()}
          onSchedule={() => scheduleMutation.mutate()}
          onUnschedule={() => unscheduleMutation.mutate()}
          onArchivePost={() => {
            if (
              window.confirm(
                'Archive this post? It will be hidden from active Posts, Dashboard, and Calendar views.',
              )
            ) {
              archivePostMutation.mutate();
            }
          }}
          onRestorePost={() => restorePostMutation.mutate()}
          onCopyText={async (label, text) => {
            try {
              await copyTextToClipboard(text);
              setMessage(`${label} copied.`);
              setError(null);
            } catch (copyError) {
              setError(readError(copyError, 'Could not copy text.'));
              setMessage(null);
            }
          }}
          onUpload={(files) => uploadMutation.mutate(files)}
          onDeleteMedia={(media) => {
            if (window.confirm('Delete this uploaded image?')) {
              deleteMediaMutation.mutate(media);
            }
          }}
          onDeletePost={() => {
            if (window.confirm('Permanently delete this post? This cannot be undone.')) {
              deletePostMutation.mutate();
            }
          }}
          onEditedImageSaved={async () => {
            setMessage('Edited image saved.');
            setError(null);
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ['posts', activeBusiness?.id] }),
              queryClient.invalidateQueries({ queryKey: ['post', selectedPostId] }),
            ]);
          }}
        />
      </div>
    </div>
  );
}

function PostListCard({
  post,
  isSelected,
  onSelect,
}: {
  post: PostSummary;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const previewUrl = getFirstMediaPreviewUrl(post);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group grid w-full grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-lg border bg-card/65 p-3 text-left text-card-foreground shadow-[0_14px_45px_rgba(2,6,23,0.24)] backdrop-blur-xl transition-all duration-200 hover:border-primary/50 hover:bg-primary/10 hover:shadow-[0_18px_55px_rgba(2,6,23,0.3),0_0_30px_rgba(56,189,248,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none',
        isSelected
          ? 'border-primary/70 bg-primary/15 shadow-[0_18px_58px_rgba(2,6,23,0.32),0_0_34px_rgba(56,189,248,0.18)]'
          : 'border-border/70',
      )}
    >
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md border border-primary/15 bg-secondary/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        {previewUrl ? (
          <img src={previewUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImagePlus className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={statusStyles[post.status]}>{statusLabels[post.status]}</Badge>
          {post.archivedAt && (
            <Badge className="border-muted-foreground/30 bg-muted/20 text-muted-foreground">
              Archived
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">{post.platformSize}</span>
        </div>
        <p className="mt-2 line-clamp-2 text-sm font-medium">{post.caption || 'Untitled draft'}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Updated {formatDate(post.updatedAt)} / Created {formatDate(post.createdAt)}
        </p>
        {post.archivedAt && (
          <p className="mt-1 text-xs text-muted-foreground">
            Archived {formatDate(post.archivedAt)}
          </p>
        )}
      </div>
    </button>
  );
}

function PostEditor({
  detail,
  businessId,
  getToken,
  businessLogoUrl,
  form,
  statusOptions,
  isLoading,
  isSaving,
  isUploading,
  isDeletingPost,
  isArchivingPost,
  isRestoringPost,
  isDeletingMedia,
  isExporting,
  isScheduling,
  isUnscheduling,
  scheduleDate,
  scheduleTime,
  businessTimezone,
  onChange,
  onScheduleDateChange,
  onScheduleTimeChange,
  onSave,
  onExport,
  onSchedule,
  onUnschedule,
  onArchivePost,
  onRestorePost,
  onCopyText,
  onUpload,
  onDeleteMedia,
  onDeletePost,
  onEditedImageSaved,
}: {
  detail: PostDetail | undefined;
  businessId: string | undefined;
  getToken: () => Promise<string | null>;
  businessLogoUrl: string | null | undefined;
  form: PostFormState;
  statusOptions: PostStatus[];
  isLoading: boolean;
  isSaving: boolean;
  isUploading: boolean;
  isDeletingPost: boolean;
  isArchivingPost: boolean;
  isRestoringPost: boolean;
  isDeletingMedia: boolean;
  isExporting: boolean;
  isScheduling: boolean;
  isUnscheduling: boolean;
  scheduleDate: string;
  scheduleTime: string;
  businessTimezone: string | undefined;
  onChange: (form: PostFormState) => void;
  onScheduleDateChange: (value: string) => void;
  onScheduleTimeChange: (value: string) => void;
  onSave: () => void;
  onExport: () => void;
  onSchedule: () => void;
  onUnschedule: () => void;
  onArchivePost: () => void;
  onRestorePost: () => void;
  onCopyText: (label: string, text: string) => Promise<void> | void;
  onUpload: (files: File[]) => void;
  onDeleteMedia: (media: PostMediaRecord) => void;
  onDeletePost: () => void;
  onEditedImageSaved: (media: PostMediaRecord) => Promise<void> | void;
}) {
  if (isLoading) {
    return (
      <Card className="overflow-hidden border-primary/15 bg-card/65" aria-busy="true">
        <CardHeader>
          <CardTitle>Loading post</CardTitle>
          <CardDescription>Opening the selected draft.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="h-2 rounded-full bg-primary/15 motion-safe:animate-pulse" />
          <div className="h-2 w-3/4 rounded-full bg-violet-300/15 motion-safe:animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!detail) {
    return (
      <Card className="border-dashed border-primary/25 bg-card/55">
        <CardHeader>
          <Pencil className="h-5 w-5 text-primary" aria-hidden="true" />
          <CardTitle>Select or create a draft</CardTitle>
          <CardDescription>
            Choose a post from the list, or create a draft to add caption notes and images.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const editorBackground = getFirstOriginalMedia(detail.media);
  const exportMedia = selectExportMedia(detail.media);
  const formattedHashtags = formatHashtagsForPost(parseHashtagsInput(form.hashtags));
  const fullPostText = buildFullPostText({
    caption: form.caption,
    hashtags: parseHashtagsInput(form.hashtags),
  });
  const isExportable = canExportPost(detail.post.status);
  const isQuickExport = detail.post.status === 'draft' || detail.post.status === 'ready_for_review';
  const isArchived = Boolean(detail.post.archivedAt);
  const statusSelectOptions = statusOptions.filter(
    (status) => status !== 'scheduled' || detail.post.status === 'scheduled',
  );

  return (
    <Card className="overflow-hidden border-primary/15 bg-card/70">
      <CardHeader className="relative overflow-hidden border-b border-border/60 bg-secondary/25">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(56,189,248,0.13),transparent_32%),linear-gradient(90deg,rgba(56,189,248,0.08),transparent_38%)]" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="relative flex items-start gap-3">
            <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary/10 shadow-[0_0_22px_rgba(56,189,248,0.14)]">
              <Pencil className="h-4 w-4 text-primary" aria-hidden="true" />
            </span>
            <div>
              <CardTitle>{isArchived ? 'Archived post' : 'Edit post'}</CardTitle>
              <CardDescription>
                {isArchived
                  ? 'Restore this post to bring it back into active workspace views.'
                  : 'Save copy, upload images, and move through the lean Phase 3 review states.'}
              </CardDescription>
            </div>
          </div>
          <div className="relative flex flex-wrap gap-2">
            {isArchived ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRestorePost}
                disabled={isRestoringPost}
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                {isRestoringPost ? 'Restoring' : 'Restore'}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onArchivePost}
                disabled={isArchivingPost}
              >
                <Archive className="h-4 w-4" aria-hidden="true" />
                {isArchivingPost ? 'Archiving' : 'Archive'}
              </Button>
            )}
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onDeletePost}
              disabled={isDeletingPost}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {isDeletingPost ? 'Deleting' : 'Delete permanently'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="post-status">Status</Label>
            <Select
              id="post-status"
              value={form.status}
              onChange={(event) => onChange({ ...form, status: event.target.value as PostStatus })}
            >
              {statusSelectOptions.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="platform-size">Platform size</Label>
            <Select
              id="platform-size"
              value={form.platformSize}
              onChange={(event) => onChange({ ...form, platformSize: event.target.value })}
            >
              {platformSizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="post-caption">Caption</Label>
          <Textarea
            id="post-caption"
            value={form.caption}
            onChange={(event) => onChange({ ...form, caption: event.target.value })}
            placeholder="Write the post caption."
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void onCopyText('Caption', form.caption.trim())}
              disabled={!form.caption.trim()}
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copy caption
            </Button>
          </div>
        </div>

        {businessId && (
          <CaptionGenerator
            businessId={businessId}
            getToken={getToken}
            onUseCaption={(selection) => {
              onChange(applyCaptionSelection(form, selection));
            }}
          />
        )}

        <div className="space-y-2">
          <Label htmlFor="post-hashtags">Hashtags</Label>
          <Input
            id="post-hashtags"
            value={form.hashtags}
            onChange={(event) => onChange({ ...form, hashtags: event.target.value })}
            placeholder="#local, #smallbusiness"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void onCopyText('Hashtags', formattedHashtags)}
              disabled={!formattedHashtags}
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copy hashtags
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void onCopyText('Post text', fullPostText)}
              disabled={!fullPostText}
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copy full post
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="post-notes">Notes</Label>
          <Textarea
            id="post-notes"
            value={form.notes}
            onChange={(event) => onChange({ ...form, notes: event.target.value })}
            placeholder="Internal notes for review."
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={onSave} disabled={isSaving}>
            {isSaving ? 'Saving' : 'Save Post'}
          </Button>
          <Button
            type="button"
            variant={isExportable ? 'default' : 'outline'}
            onClick={onExport}
            disabled={isExporting}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {detail.post.status === 'exported'
              ? isExporting
                ? 'Re-exporting'
                : 'Re-export'
              : detail.post.status === 'approved' || detail.post.status === 'scheduled'
                ? isExporting
                  ? 'Exporting'
                  : 'Export'
                : isExporting
                  ? 'Exporting'
                  : 'Export Now'}
          </Button>
        </div>

        {isQuickExport && (
          <p className="text-sm text-muted-foreground">
            Quick export skips the manual review steps for solo workflows.
          </p>
        )}

        {detail.post.status === 'approved' && (
          <div className="space-y-3 rounded-md border border-cyan-300/20 bg-cyan-400/10 p-4 shadow-[0_0_30px_rgba(34,211,238,0.08)]">
            <div className="flex items-start gap-2">
              <CalendarClock className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-semibold">Schedule for Later</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Times are shown in {businessTimezone ?? 'the business timezone'}.
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-end">
              <div className="space-y-2">
                <Label htmlFor="schedule-date">Date</Label>
                <Input
                  id="schedule-date"
                  type="date"
                  value={scheduleDate}
                  onChange={(event) => onScheduleDateChange(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="schedule-time">Time</Label>
                <Select
                  id="schedule-time"
                  value={scheduleTime}
                  onChange={(event) => onScheduleTimeChange(event.target.value)}
                >
                  {scheduleTimeOptions.map((time) => (
                    <option key={time} value={time}>
                      {formatTimeOption(time)}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="button" onClick={onSchedule} disabled={isScheduling}>
                {isScheduling ? 'Scheduling' : 'Schedule'}
              </Button>
            </div>
          </div>
        )}

        {detail.post.status === 'scheduled' && (
          <div className="space-y-3 rounded-md border border-primary/25 bg-primary/10 p-4 shadow-[0_0_30px_rgba(56,189,248,0.1)]">
            <div className="flex items-start gap-2">
              <CalendarClock className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-semibold text-primary">Scheduled post</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {detail.post.scheduledAt
                    ? `Scheduled for ${formatDateTime(detail.post.scheduledAt, businessTimezone)}`
                    : 'Scheduled time unavailable'}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onUnschedule}
              disabled={isUnscheduling}
            >
              {isUnscheduling ? 'Unscheduling' : 'Unschedule'}
            </Button>
          </div>
        )}

        {detail.post.status === 'exported' && (
          <div className="space-y-3 rounded-md border border-primary/25 bg-primary/10 p-4 shadow-[0_0_30px_rgba(56,189,248,0.1)]">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-semibold text-primary">Exported post</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {detail.post.exportedAt
                    ? `Exported ${formatDateTime(detail.post.exportedAt)}`
                    : 'Exported timestamp unavailable'}
                </p>
              </div>
            </div>
            {exportMedia && (
              <div className="overflow-hidden rounded-md border border-primary/15 bg-secondary/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <img src={exportMedia.blobUrl} alt="" className="max-h-80 w-full object-contain" />
              </div>
            )}
            <div className="space-y-2 text-sm">
              <p className="whitespace-pre-wrap">{form.caption || 'No caption saved.'}</p>
              {formattedHashtags && (
                <p className="break-words text-muted-foreground">{formattedHashtags}</p>
              )}
            </div>
          </div>
        )}

        {!isExportable && (
          <p className="text-sm text-muted-foreground">This post cannot be exported yet.</p>
        )}

        <div className="space-y-3 border-t border-border/60 pt-5">
          <div className="flex items-start gap-2">
            <Upload className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
            <div>
              <h3 className="text-sm font-semibold">Images</h3>
              <p className="mt-1 text-sm text-muted-foreground">JPEG, PNG, or WebP. Maximum 4MB.</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              type="file"
              className="cursor-pointer border-dashed border-primary/25 bg-primary/5 hover:border-primary/45 hover:bg-primary/10"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={isUploading}
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                event.currentTarget.value = '';

                if (files.length > 0) {
                  onUpload(files);
                }
              }}
            />
            <div className="flex min-h-10 items-center text-sm text-muted-foreground">
              <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
              {isUploading ? 'Uploading' : 'Add images'}
            </div>
          </div>

          <ImageEditor
            postId={detail.post.id}
            backgroundMedia={editorBackground}
            businessLogoUrl={businessLogoUrl}
            getToken={getToken}
            onSaved={onEditedImageSaved}
          />

          {detail.media.length === 0 ? (
            <div className="rounded-md border border-dashed border-primary/25 bg-secondary/35 p-4 text-sm text-muted-foreground">
              No images uploaded yet.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {detail.media.map((media) => (
                <div
                  key={media.id}
                  className="rounded-md border border-border/70 bg-card/45 p-2 shadow-[0_12px_36px_rgba(2,6,23,0.22)]"
                >
                  <div className="aspect-square overflow-hidden rounded-md bg-secondary/55">
                    <img src={media.blobUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs text-muted-foreground">{media.mimeType}</p>
                      {media.isEdited && <p className="text-xs font-medium text-primary">Edited</p>}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteMedia(media)}
                      disabled={isDeletingMedia}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value: string, timeZone?: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
    timeZoneName: timeZone ? 'short' : undefined,
  }).format(new Date(value));
}

const scheduleTimeOptions = Array.from({ length: 48 }, (_item, index) => {
  const hours = Math.floor(index / 2);
  const minutes = index % 2 === 0 ? '00' : '30';
  return `${String(hours).padStart(2, '0')}:${minutes}`;
});

function formatTimeOption(value: string) {
  const [hours = '0', minutes = '00'] = value.split(':');
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function getLocalDateTimeParts(value: string) {
  const date = new Date(value);

  return {
    date: formatInputDate(date),
    time: `${String(date.getHours()).padStart(2, '0')}:${date.getMinutes() < 30 ? '00' : '30'}`,
  };
}

function getDefaultScheduleParts() {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 60);
  date.setMinutes(date.getMinutes() <= 30 ? 30 : 60, 0, 0);

  return {
    date: formatInputDate(date),
    time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
  };
}

function formatInputDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function buildScheduledAtIso(dateValue: string, timeValue: string) {
  if (!dateValue || !timeValue) {
    throw new Error('Choose a future date and time.');
  }

  const scheduledAt = new Date(`${dateValue}T${timeValue}:00`);

  if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
    throw new Error('Choose a future date and time.');
  }

  return scheduledAt.toISOString();
}

function readError(error: unknown, fallback: string) {
  return toUserFacingError(error, fallback);
}

function applyCaptionSelection(
  form: PostFormState,
  selection: CaptionGeneratorSelection,
): PostFormState {
  return {
    ...form,
    caption: selection.caption,
    hashtags: formatHashtagsInput(selection.hashtags),
    aiGenerated: selection.aiGenerated,
  };
}
