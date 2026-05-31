import { allowedPostStatusTransitions, type PostStatus } from './status.ts';

export const clientAllowedImageMimeTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const clientMaxImageUploadBytes = 4 * 1024 * 1024;

export type ImageLike = {
  name: string;
  size: number;
  type: string;
};

export type PreviewMediaLike = {
  blobUrl: string;
};

export type PostPreviewLike = {
  firstMedia?: PreviewMediaLike | null;
};

export function getAvailableStatusOptions(status: PostStatus) {
  return [status, ...allowedPostStatusTransitions[status]];
}

export function parseHashtagsInput(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));
}

export function formatHashtagsInput(hashtags: string[] | null | undefined) {
  return hashtags?.join(', ') ?? '';
}

export function validateClientImageFile(file: ImageLike) {
  if (!clientAllowedImageMimeTypes.includes(file.type as (typeof clientAllowedImageMimeTypes)[number])) {
    throw new Error('Choose a JPEG, PNG, or WebP image. HEIC and HEIF are not supported.');
  }

  if (file.size > clientMaxImageUploadBytes) {
    throw new Error('Image must be 4MB or smaller.');
  }
}

export function getFirstMediaPreviewUrl(post: PostPreviewLike) {
  return post.firstMedia?.blobUrl ?? null;
}
