import type { PostStatus } from './status.ts';
import { validateClientImageFile } from './ui.ts';

export type AuthTokenProvider = () => Promise<string | null>;

export type PostMediaRecord = {
  id: string;
  postId: string;
  blobUrl: string;
  blobKey: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  isEdited: boolean;
  originalUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PostRecord = {
  id: string;
  businessId: string;
  status: PostStatus;
  caption: string | null;
  hashtags: string[] | null;
  platformSize: string;
  notes: string | null;
  aiGenerated: boolean;
  exportedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PostSummary = PostRecord & {
  mediaCount?: number;
  firstMedia?: PostMediaRecord | null;
};

export type PostDetail = {
  post: PostRecord;
  media: PostMediaRecord[];
};

export type UpdatePostInput = {
  caption?: string;
  hashtags?: string[];
  platform_size?: string;
  notes?: string;
  status?: PostStatus;
};

export function buildCreateDraftPayload(businessId: string) {
  return { business_id: businessId };
}

export async function listPosts(getToken: AuthTokenProvider, businessId: string) {
  const searchParams = new URLSearchParams({ business_id: businessId });
  const data = await authedRequest<{ posts: PostSummary[] }>(
    getToken,
    `/api/posts?${searchParams.toString()}`,
  );

  return data.posts;
}

export async function createDraftPost(getToken: AuthTokenProvider, businessId: string) {
  const data = await authedRequest<{ post: PostRecord }>(getToken, '/api/posts', {
    method: 'POST',
    body: JSON.stringify(buildCreateDraftPayload(businessId)),
  });

  return data.post;
}

export async function getPost(getToken: AuthTokenProvider, postId: string) {
  return authedRequest<PostDetail>(getToken, `/api/posts/${postId}`);
}

export async function updatePost(
  getToken: AuthTokenProvider,
  postId: string,
  input: UpdatePostInput,
) {
  const data = await authedRequest<{ post: PostRecord }>(getToken, `/api/posts/${postId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });

  return data.post;
}

export async function deletePost(getToken: AuthTokenProvider, postId: string) {
  await authedRequest<{ deleted: true }>(getToken, `/api/posts/${postId}`, {
    method: 'DELETE',
  });
}

export async function uploadPostImage(getToken: AuthTokenProvider, postId: string, file: File) {
  validateClientImageFile(file);

  const formData = new FormData();
  formData.append('post_id', postId);
  formData.append('file', file);

  const data = await authedRequest<{ media: PostMediaRecord }>(getToken, '/api/media/upload', {
    method: 'POST',
    body: formData,
  });

  return data.media;
}

export async function deletePostImage(getToken: AuthTokenProvider, blobKey: string) {
  await authedRequest<{ deleted: true }>(getToken, `/api/media/${encodeURIComponent(blobKey)}`, {
    method: 'DELETE',
  });
}

async function authedRequest<T>(
  getToken: AuthTokenProvider,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await getToken();

  if (!token) {
    throw new Error('You must be signed in.');
  }

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);

  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, {
    ...init,
    headers,
  });
  const payload = (await response.json().catch(() => null)) as T | { error?: string } | null;

  if (!response.ok) {
    throw new Error((payload as { error?: string } | null)?.error ?? 'Request failed.');
  }

  return payload as T;
}
