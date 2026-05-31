import type { PostStatus } from './status.ts';
import { buildEditedImageUploadFormData } from './image-editor.ts';
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
  scheduledAt: string | null;
  exportedAt: string | null;
  manualPostedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PostSummary = PostRecord & {
  mediaCount?: number;
  firstMedia?: PostMediaRecord | null;
  finalMedia?: PostMediaRecord | null;
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
  ai_generated?: boolean;
  status?: PostStatus;
  scheduled_at?: string | null;
  manual_posted?: boolean;
};

export type CaptionTone = 'professional' | 'casual' | 'funny' | 'inspirational';

export type GenerateCaptionInput = {
  business_id: string;
  prompt_context: string;
  tone: CaptionTone;
  include_hashtags: boolean;
  image_description?: string;
};

export type GeneratedCaption = {
  caption: string;
  hashtags: string[];
  alternatives: string[];
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

export async function uploadEditedPostImage(
  getToken: AuthTokenProvider,
  input: {
    postId: string;
    file: Blob;
    width: number;
    height: number;
    originalUrl?: string | null;
  },
) {
  const data = await authedRequest<{ media: PostMediaRecord }>(getToken, '/api/media/edited', {
    method: 'POST',
    body: buildEditedImageUploadFormData(input),
  });

  return data.media;
}

export async function generateCaption(
  getToken: AuthTokenProvider,
  input: GenerateCaptionInput,
) {
  return authedRequest<GeneratedCaption>(getToken, '/api/captions/generate', {
    method: 'POST',
    body: JSON.stringify(input),
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
  const responseText = await response.text().catch(() => '');
  const payload = parseResponsePayload<T>(responseText);

  if (!response.ok) {
    throw new Error(
      (payload as { error?: string } | null)?.error ??
        buildRequestErrorMessage(response.status, responseText),
    );
  }

  return payload as T;
}

function parseResponsePayload<T>(responseText: string) {
  if (!responseText) {
    return null as T | { error?: string } | null;
  }

  try {
    return JSON.parse(responseText) as T | { error?: string };
  } catch {
    return null;
  }
}

function buildRequestErrorMessage(status: number, responseText: string) {
  if (status === 413) {
    return 'Image is too large for upload. Choose an image 4MB or smaller.';
  }

  if (status >= 400) {
    return `Request failed (${status}).`;
  }

  return responseText || 'Request failed.';
}
