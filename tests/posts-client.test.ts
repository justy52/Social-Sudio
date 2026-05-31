import assert from 'node:assert/strict';
import test from 'node:test';
import { createDraftPost, generateCaption } from '../src/lib/posts/client.ts';
import { buildCaptionSelection } from '../src/lib/posts/captions-ui.ts';
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

test('generateCaption posts the expected authed request shape', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const body = JSON.parse(String(init?.body));

    assert.equal(input, '/api/captions/generate');
    assert.equal(init?.method, 'POST');
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer test-token');
    assert.equal(new Headers(init?.headers).get('Content-Type'), 'application/json');
    assert.deepEqual(body, {
      business_id: '11111111-1111-4111-8111-111111111111',
      prompt_context: 'New cedar fence installation in Heber City',
      tone: 'casual',
      include_hashtags: true,
      image_description: 'A finished cedar fence beside a mountain home',
    });
    assert.equal('api_key' in body, false);
    assert.equal('ANTHROPIC_API_KEY' in body, false);

    return new Response(
      JSON.stringify({
        caption: 'Fresh cedar, clean lines, and a yard ready for summer.',
        hashtags: ['#FenceLife', '#HeberCity'],
        alternatives: ['A sturdy cedar upgrade.', 'Privacy with polished curb appeal.'],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  try {
    const result = await generateCaption(async () => 'test-token', {
      business_id: '11111111-1111-4111-8111-111111111111',
      prompt_context: 'New cedar fence installation in Heber City',
      tone: 'casual',
      include_hashtags: true,
      image_description: 'A finished cedar fence beside a mountain home',
    });

    assert.equal(result.caption, 'Fresh cedar, clean lines, and a yard ready for summer.');
    assert.deepEqual(result.hashtags, ['#FenceLife', '#HeberCity']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('caption selection helper prepares generated caption values for the editor form', () => {
  assert.deepEqual(
    buildCaptionSelection(
      {
        caption: 'Primary caption',
        hashtags: ['#FenceLife', '#HeberCity'],
        alternatives: ['Alternative caption', 'Second option'],
      },
      ' Alternative caption ',
    ),
    {
      caption: 'Alternative caption',
      hashtags: ['#FenceLife', '#HeberCity'],
      aiGenerated: true,
    },
  );
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
