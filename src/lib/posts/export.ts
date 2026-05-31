import type { PostDetail, PostMediaRecord, PostRecord } from './client.ts';

export type ExportablePostStatus = 'approved' | 'exported';

export function canExportPost(status: PostRecord['status']) {
  return status === 'approved' || status === 'exported';
}

export function assertCanExportPost(status: PostRecord['status']) {
  if (!canExportPost(status)) {
    throw new Error('Approve this post before exporting.');
  }
}

export function selectExportMedia(media: PostMediaRecord[]) {
  return media.find((item) => item.isEdited) ?? media.find((item) => !item.isEdited) ?? null;
}

export function getExportFileName(
  post: Pick<PostRecord, 'id' | 'platformSize'>,
  media?: Pick<PostMediaRecord, 'isEdited' | 'mimeType'> | null,
) {
  return `social-studio-${post.platformSize}-${post.id}.${getExportFileExtension(media)}`;
}

function getExportFileExtension(media?: Pick<PostMediaRecord, 'isEdited' | 'mimeType'> | null) {
  if (!media || media.isEdited || media.mimeType === 'image/png') {
    return 'png';
  }

  if (media.mimeType === 'image/jpeg') {
    return 'jpg';
  }

  if (media.mimeType === 'image/webp') {
    return 'webp';
  }

  return 'png';
}

export function formatHashtagsForPost(hashtags: string[] | null | undefined) {
  return (hashtags ?? [])
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`))
    .join(' ');
}

export function buildFullPostText(input: {
  caption: string | null | undefined;
  hashtags: string[] | null | undefined;
}) {
  return [input.caption?.trim(), formatHashtagsForPost(input.hashtags)]
    .filter(Boolean)
    .join('\n\n');
}

export function prepareManualExport(detail: PostDetail) {
  assertCanExportPost(detail.post.status);
  const media = selectExportMedia(detail.media);

  if (!media) {
    throw new Error('Add or save an image before exporting.');
  }

  return {
    media,
    fileName: getExportFileName(detail.post, media),
    text: buildFullPostText({
      caption: detail.post.caption,
      hashtags: detail.post.hashtags,
    }),
  };
}

export async function copyTextToClipboard(text: string) {
  if (!navigator.clipboard?.writeText) {
    throw new Error('Clipboard is not available in this browser.');
  }

  await navigator.clipboard.writeText(text);
}

export async function downloadImageFromUrl(url: string, fileName: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Could not download image.');
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = objectUrl;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
