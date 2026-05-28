import assert from 'node:assert/strict';
import test from 'node:test';
import { createDraftPost } from '../src/lib/posts/client.ts';
import {
  getAvailableStatusOptions,
  getFirstMediaPreviewUrl,
  validateClientImageFile,
} from '../src/lib/posts/ui.ts';

test('createDraftPost calls the posts API with the selected business id', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    assert.equal(input, '/api/posts');
    assert.equal(init?.method, 'POST');
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer test-token');
    assert.deepEqual(JSON.parse(String(init?.body)), { business_id: 'business_1' });

    return new Response(
      JSON.stringify({
        post: {
          id: 'post_1',
          businessId: 'business_1',
          status: 'draft',
          caption: null,
          hashtags: [],
          platformSize: '1080x1080',
          notes: null,
          aiGenerated: false,
          exportedAt: null,
          createdAt: '2026-05-28T00:00:00.000Z',
          updatedAt: '2026-05-28T00:00:00.000Z',
        },
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    );
  };

  try {
    const post = await createDraftPost(async () => 'test-token', 'business_1');
    assert.equal(post.id, 'post_1');
    assert.equal(post.status, 'draft');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('status options expose only valid next transitions for the edit form', () => {
  assert.deepEqual(getAvailableStatusOptions('draft'), ['draft', 'ready_for_review']);
  assert.deepEqual(getAvailableStatusOptions('ready_for_review'), [
    'ready_for_review',
    'approved',
    'draft',
  ]);
  assert.deepEqual(getAvailableStatusOptions('approved'), ['approved', 'exported', 'draft']);
});

test('client upload validation rejects non-image files', () => {
  assert.throws(
    () => validateClientImageFile({ name: 'brief.pdf', size: 100, type: 'application/pdf' }),
    /JPEG, PNG, or WebP/,
  );
});

test('media preview URL comes from the API response shape', () => {
  assert.equal(
    getFirstMediaPreviewUrl({
      firstMedia: {
        blobUrl: 'https://blob.example/businesses/biz/posts/post/image.png',
      },
    }),
    'https://blob.example/businesses/biz/posts/post/image.png',
  );
});
