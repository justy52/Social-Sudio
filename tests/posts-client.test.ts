import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDraftPost,
  generateCaption,
  uploadEditedPostImage,
  uploadPostImage,
} from '../src/lib/posts/client.ts';
import { buildCaptionSelection } from '../src/lib/posts/captions-ui.ts';
import {
  buildEditedImageFileName,
  buildEditedImageUploadFormData,
  calculateImageDrawRect,
  parseImageSizePreset,
} from '../src/lib/posts/image-editor.ts';
import {
  getAvailableStatusOptions,
  getFirstMediaPreviewUrl,
  validateClientImageFile,
} from '../src/lib/posts/ui.ts';
import { resolveLocalApiRoutePath } from '../vite.config.ts';

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
    assert.equal('OPENAI_API_KEY' in body, false);

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

test('image editor parses supported size presets', () => {
  assert.deepEqual(parseImageSizePreset('1080x1350'), {
    id: '1080x1350',
    label: 'Instagram portrait',
    width: 1080,
    height: 1350,
  });
  assert.throws(() => parseImageSizePreset('1920x1080'), /Unsupported image size preset/);
});

test('image editor calculates fit and fill background rectangles', () => {
  assert.deepEqual(
    calculateImageDrawRect({
      sourceWidth: 2000,
      sourceHeight: 1000,
      targetWidth: 1080,
      targetHeight: 1080,
      fit: 'fit',
    }),
    { x: 0, y: 270, width: 1080, height: 540 },
  );

  assert.deepEqual(
    calculateImageDrawRect({
      sourceWidth: 2000,
      sourceHeight: 1000,
      targetWidth: 1080,
      targetHeight: 1080,
      fit: 'fill',
    }),
    { x: -540, y: 0, width: 2160, height: 1080 },
  );
});

test('edited image upload form data includes render metadata', () => {
  const blob = new Blob(['png-bytes'], { type: 'image/png' });
  const formData = buildEditedImageUploadFormData({
    postId: '11111111-1111-4111-8111-111111111111',
    file: blob,
    width: 1080,
    height: 566,
    originalUrl: 'https://blob.example/original.png',
  });

  assert.equal(formData.get('post_id'), '11111111-1111-4111-8111-111111111111');
  assert.equal(formData.get('width'), '1080');
  assert.equal(formData.get('height'), '566');
  assert.equal(formData.get('original_url'), 'https://blob.example/original.png');
  assert.equal((formData.get('file') as File).name, 'edited-11111111-1111-4111-8111-111111111111.png');
  assert.equal(buildEditedImageFileName('post_1'), 'edited-post_1.png');
});

test('uploadEditedPostImage posts edited PNG form data with auth', async () => {
  const originalFetch = globalThis.fetch;
  const blob = new Blob(['png-bytes'], { type: 'image/png' });

  globalThis.fetch = async (input, init) => {
    const formData = init?.body as FormData;

    assert.equal(input, '/api/media/edited');
    assert.equal(init?.method, 'POST');
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer test-token');
    assert.equal(new Headers(init?.headers).has('Content-Type'), false);
    assert.equal(formData.get('post_id'), '11111111-1111-4111-8111-111111111111');
    assert.equal(formData.get('width'), '1200');
    assert.equal(formData.get('height'), '630');
    assert.equal(formData.get('original_url'), 'https://blob.example/original.png');
    assert.equal((formData.get('file') as File).name, 'edited-11111111-1111-4111-8111-111111111111.png');

    return new Response(
      JSON.stringify({
        media: {
          id: 'media_edited',
          postId: '11111111-1111-4111-8111-111111111111',
          blobUrl: 'https://blob.example/edited.png',
          blobKey: 'businesses/business_1/posts/post_1/edited.png',
          mimeType: 'image/png',
          width: 1200,
          height: 630,
          isEdited: true,
          originalUrl: 'https://blob.example/original.png',
          createdAt: '2026-05-31T00:00:00.000Z',
          updatedAt: '2026-05-31T00:00:00.000Z',
        },
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    );
  };

  try {
    const media = await uploadEditedPostImage(async () => 'test-token', {
      postId: '11111111-1111-4111-8111-111111111111',
      file: blob,
      width: 1200,
      height: 630,
      originalUrl: 'https://blob.example/original.png',
    });

    assert.equal(media.isEdited, true);
    assert.equal(media.width, 1200);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('uploadPostImage posts original image form data without forcing multipart content type', async () => {
  const originalFetch = globalThis.fetch;
  const file = new File(['image-bytes'], 'launch.png', { type: 'image/png' });

  globalThis.fetch = async (input, init) => {
    const formData = init?.body as FormData;

    assert.equal(input, '/api/media/upload');
    assert.equal(init?.method, 'POST');
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer test-token');
    assert.equal(new Headers(init?.headers).has('Content-Type'), false);
    assert.equal(formData.get('post_id'), '11111111-1111-4111-8111-111111111111');
    assert.equal((formData.get('file') as File).name, 'launch.png');

    return new Response(
      JSON.stringify({
        media: {
          id: 'media_original',
          postId: '11111111-1111-4111-8111-111111111111',
          blobUrl: 'https://blob.example/original.png',
          blobKey: 'businesses/business_1/posts/post_1/original.png',
          mimeType: 'image/png',
          width: null,
          height: null,
          isEdited: false,
          originalUrl: null,
          createdAt: '2026-05-31T00:00:00.000Z',
          updatedAt: '2026-05-31T00:00:00.000Z',
        },
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    );
  };

  try {
    const media = await uploadPostImage(
      async () => 'test-token',
      '11111111-1111-4111-8111-111111111111',
      file,
    );

    assert.equal(media.isEdited, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('local API adapter includes media upload routes before the media key catchall', () => {
  assert.deepEqual(resolveLocalApiRoutePath('/api/media/upload'), {
    modulePath: '/api/media/upload.ts',
    parseBody: true,
  });
  assert.deepEqual(resolveLocalApiRoutePath('/api/media/edited'), {
    modulePath: '/api/media/edited.ts',
    parseBody: true,
  });
  assert.deepEqual(resolveLocalApiRoutePath('/api/media/businesses%2Fbiz%2Fposts%2Fpost%2Ffile.png'), {
    modulePath: '/api/media/[key].ts',
    params: { key: 'businesses/biz/posts/post/file.png' },
    parseBody: true,
  });
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
