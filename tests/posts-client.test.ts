import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDraftPost,
  generateCaption,
  updatePost,
  uploadEditedPostImage,
  uploadPostImage,
  type PostDetail,
  type PostSummary,
} from '../src/lib/posts/client.ts';
import { buildCaptionSelection } from '../src/lib/posts/captions-ui.ts';
import {
  applyQuickExportStatusTransitions,
  assertCanExportPost,
  buildFullPostText,
  formatHashtagsForPost,
  getQuickExportStatusSequence,
  prepareManualExport,
  selectExportMedia,
} from '../src/lib/posts/export.ts';
import {
  buildUnschedulePayload,
  buildMarkPostedPayload,
  buildUndoPostedPayload,
  canQueuePostExport,
  filterCalendarQueuePosts,
  getQueuePostCompletionState,
  getTodayQueueEmptyState,
  getTodayQueueSections,
  getQueueThumbnailUrl,
  groupCalendarQueuePosts,
  isQueuePostManuallyPosted,
  type CalendarQueueFilter,
} from '../src/lib/posts/calendar-queue.ts';
import { buildDashboardSummary } from '../src/lib/posts/dashboard.ts';
import {
  buildEditedImageFileName,
  buildEditedImageUploadFormData,
  calculateImageDrawRect,
  parseImageSizePreset,
} from '../src/lib/posts/image-editor.ts';
import {
  getAvailableStatusOptions,
  getFinalMediaPreviewUrl,
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
          scheduledAt: null,
          exportedAt: null,
          manualPostedAt: null,
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

const exportDetail: PostDetail = {
  post: {
    id: 'post_1',
    businessId: 'business_1',
    status: 'approved',
    caption: 'Finished cedar privacy fence.',
    hashtags: ['FenceLife', '#HeberCity'],
    platformSize: '1080x1080',
    notes: null,
    aiGenerated: false,
    scheduledAt: null,
    exportedAt: null,
    manualPostedAt: null,
    createdAt: '2026-05-31T00:00:00.000Z',
    updatedAt: '2026-05-31T00:00:00.000Z',
  },
  media: [
    {
      id: 'media_original',
      postId: 'post_1',
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
    {
      id: 'media_edited',
      postId: 'post_1',
      blobUrl: 'https://blob.example/edited.png',
      blobKey: 'businesses/business_1/posts/post_1/edited.png',
      mimeType: 'image/png',
      width: 1080,
      height: 1080,
      isEdited: true,
      originalUrl: 'https://blob.example/original.png',
      createdAt: '2026-05-31T00:00:00.000Z',
      updatedAt: '2026-05-31T00:00:00.000Z',
    },
  ],
};

test('export action chooses edited image before original image', () => {
  const prepared = prepareManualExport(exportDetail);

  assert.equal(prepared.media.id, 'media_edited');
  assert.equal(selectExportMedia(exportDetail.media)?.id, 'media_edited');
  assert.equal(prepared.fileName, 'social-studio-1080x1080-post_1.png');
});

test('export action falls back to original image when no edited image exists', () => {
  const prepared = prepareManualExport({
    ...exportDetail,
    media: exportDetail.media
      .filter((media) => !media.isEdited)
      .map((media) => ({
        ...media,
        mimeType: 'image/jpeg',
        blobUrl: 'https://blob.example/original.jpg',
      })),
  });

  assert.equal(prepared.media.id, 'media_original');
  assert.equal(prepared.fileName, 'social-studio-1080x1080-post_1.jpg');
});

test('caption and hashtag clipboard text is formatted for manual posting', () => {
  assert.equal(formatHashtagsForPost(['FenceLife', ' #HeberCity ']), '#FenceLife #HeberCity');
  assert.equal(
    buildFullPostText({
      caption: 'Finished cedar privacy fence. ',
      hashtags: ['FenceLife', '#HeberCity'],
    }),
    'Finished cedar privacy fence.\n\n#FenceLife #HeberCity',
  );
});

test('export guard allows quick export from draft review approved and exported posts', () => {
  assert.doesNotThrow(() => assertCanExportPost('draft'));
  assert.doesNotThrow(() => assertCanExportPost('ready_for_review'));
  assert.doesNotThrow(() => assertCanExportPost('approved'));
  assert.doesNotThrow(() => assertCanExportPost('exported'));
  assert.doesNotThrow(() =>
    prepareManualExport({ ...exportDetail, post: { ...exportDetail.post, status: 'draft' } }),
  );
});

test('quick export from draft performs required status transitions and ends exported', async () => {
  const transitions: string[] = [];

  const result = await applyQuickExportStatusTransitions('draft', async (status) => {
    transitions.push(status);
    return { status };
  });

  assert.deepEqual(transitions, ['ready_for_review', 'approved', 'exported']);
  assert.equal(result?.status, 'exported');
  assert.deepEqual(getQuickExportStatusSequence('draft'), [
    'ready_for_review',
    'approved',
    'exported',
  ]);
});

test('quick export from ready for review ends exported', async () => {
  const transitions: string[] = [];

  const result = await applyQuickExportStatusTransitions('ready_for_review', async (status) => {
    transitions.push(status);
    return { status };
  });

  assert.deepEqual(transitions, ['approved', 'exported']);
  assert.equal(result?.status, 'exported');
});

test('approved export transitions directly to exported and re-export keeps status unchanged', async () => {
  const approvedTransitions: string[] = [];
  const scheduledTransitions: string[] = [];
  const exportedTransitions: string[] = [];

  const approvedResult = await applyQuickExportStatusTransitions('approved', async (status) => {
    approvedTransitions.push(status);
    return { status };
  });
  const scheduledResult = await applyQuickExportStatusTransitions('scheduled', async (status) => {
    scheduledTransitions.push(status);
    return { status };
  });
  const exportedResult = await applyQuickExportStatusTransitions('exported', async (status) => {
    exportedTransitions.push(status);
    return { status };
  });

  assert.deepEqual(approvedTransitions, ['exported']);
  assert.equal(approvedResult?.status, 'exported');
  assert.deepEqual(scheduledTransitions, ['exported']);
  assert.equal(scheduledResult?.status, 'exported');
  assert.deepEqual(exportedTransitions, []);
  assert.equal(exportedResult, null);
});

test('export blocks missing image and missing caption with clear messages', () => {
  assert.throws(() => prepareManualExport({ ...exportDetail, media: [] }), /Add or save an image/);
  assert.throws(
    () =>
      prepareManualExport({
        ...exportDetail,
        post: { ...exportDetail.post, caption: '   ' },
      }),
    /Add a caption/,
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
  assert.equal(
    (formData.get('file') as File).name,
    'edited-11111111-1111-4111-8111-111111111111.png',
  );
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
    assert.equal(
      (formData.get('file') as File).name,
      'edited-11111111-1111-4111-8111-111111111111.png',
    );

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

test('uploadPostImage surfaces platform payload limit errors clearly', async () => {
  const originalFetch = globalThis.fetch;
  const file = new File(['image-bytes'], 'launch.png', { type: 'image/png' });

  globalThis.fetch = async () =>
    new Response('Payload Too Large', {
      status: 413,
      headers: { 'Content-Type': 'text/plain' },
    });

  try {
    await assert.rejects(
      () => uploadPostImage(async () => 'test-token', '11111111-1111-4111-8111-111111111111', file),
      /4MB or smaller/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('export status update is sent without client-controlled exported_at', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const body = JSON.parse(String(init?.body));

    assert.equal(input, '/api/posts/post_1');
    assert.equal(init?.method, 'PUT');
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer test-token');
    assert.equal(body.status, 'exported');
    assert.equal('exported_at' in body, false);
    assert.equal('exportedAt' in body, false);

    return new Response(
      JSON.stringify({
        post: {
          id: 'post_1',
          businessId: 'business_1',
          status: 'exported',
          caption: 'Finished cedar privacy fence.',
          hashtags: ['#FenceLife'],
          platformSize: '1080x1080',
          notes: null,
          aiGenerated: false,
          scheduledAt: null,
          exportedAt: '2026-05-31T12:00:00.000Z',
          manualPostedAt: null,
          createdAt: '2026-05-31T00:00:00.000Z',
          updatedAt: '2026-05-31T12:00:00.000Z',
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  try {
    const post = await updatePost(async () => 'test-token', 'post_1', { status: 'exported' });

    assert.equal(post.status, 'exported');
    assert.equal(post.exportedAt, '2026-05-31T12:00:00.000Z');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('client payload sends scheduled_at correctly', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const body = JSON.parse(String(init?.body));

    assert.equal(input, '/api/posts/post_1');
    assert.equal(init?.method, 'PUT');
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer test-token');
    assert.deepEqual(body, {
      status: 'scheduled',
      scheduled_at: '2026-06-01T16:30:00.000Z',
    });

    return new Response(
      JSON.stringify({
        post: {
          id: 'post_1',
          businessId: 'business_1',
          status: 'scheduled',
          caption: 'Finished cedar privacy fence.',
          hashtags: ['#FenceLife'],
          platformSize: '1080x1080',
          notes: null,
          aiGenerated: false,
          scheduledAt: '2026-06-01T16:30:00.000Z',
          exportedAt: null,
          manualPostedAt: null,
          createdAt: '2026-05-31T00:00:00.000Z',
          updatedAt: '2026-05-31T12:00:00.000Z',
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  try {
    const post = await updatePost(async () => 'test-token', 'post_1', {
      status: 'scheduled',
      scheduled_at: '2026-06-01T16:30:00.000Z',
    });

    assert.equal(post.status, 'scheduled');
    assert.equal(post.scheduledAt, '2026-06-01T16:30:00.000Z');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('unschedule action sends the correct update payload', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const body = JSON.parse(String(init?.body));

    assert.equal(input, '/api/posts/post_1');
    assert.equal(init?.method, 'PUT');
    assert.deepEqual(body, {
      status: 'approved',
      scheduled_at: null,
    });

    return new Response(
      JSON.stringify({
        post: {
          id: 'post_1',
          businessId: 'business_1',
          status: 'approved',
          caption: 'Finished cedar privacy fence.',
          hashtags: ['#FenceLife'],
          platformSize: '1080x1080',
          notes: null,
          aiGenerated: false,
          scheduledAt: null,
          exportedAt: null,
          manualPostedAt: null,
          createdAt: '2026-05-31T00:00:00.000Z',
          updatedAt: '2026-05-31T12:00:00.000Z',
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  try {
    const post = await updatePost(async () => 'test-token', 'post_1', buildUnschedulePayload());

    assert.equal(post.status, 'approved');
    assert.equal(post.scheduledAt, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('manual posted action sends server-controlled completion payload', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const body = JSON.parse(String(init?.body));

    assert.equal(input, '/api/posts/post_1');
    assert.equal(init?.method, 'PUT');
    assert.deepEqual(body, { manual_posted: true });
    assert.equal('manual_posted_at' in body, false);
    assert.equal('manualPostedAt' in body, false);

    return new Response(
      JSON.stringify({
        post: {
          id: 'post_1',
          businessId: 'business_1',
          status: 'exported',
          caption: 'Finished cedar privacy fence.',
          hashtags: ['#FenceLife'],
          platformSize: '1080x1080',
          notes: null,
          aiGenerated: false,
          scheduledAt: '2026-05-31T16:00:00.000Z',
          exportedAt: '2026-05-31T17:00:00.000Z',
          manualPostedAt: '2026-05-31T17:00:00.000Z',
          createdAt: '2026-05-31T00:00:00.000Z',
          updatedAt: '2026-05-31T17:00:00.000Z',
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  try {
    const post = await updatePost(async () => 'test-token', 'post_1', buildMarkPostedPayload());

    assert.equal(post.status, 'exported');
    assert.equal(post.manualPostedAt, '2026-05-31T17:00:00.000Z');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('undo posted action clears completion without a timestamp payload', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body));

    assert.deepEqual(body, { manual_posted: false });
    assert.equal('manual_posted_at' in body, false);
    assert.equal('manualPostedAt' in body, false);

    return new Response(
      JSON.stringify({
        post: {
          id: 'post_1',
          businessId: 'business_1',
          status: 'exported',
          caption: 'Finished cedar privacy fence.',
          hashtags: ['#FenceLife'],
          platformSize: '1080x1080',
          notes: null,
          aiGenerated: false,
          scheduledAt: '2026-05-31T16:00:00.000Z',
          exportedAt: '2026-05-31T17:00:00.000Z',
          manualPostedAt: null,
          createdAt: '2026-05-31T00:00:00.000Z',
          updatedAt: '2026-05-31T17:00:00.000Z',
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  try {
    const post = await updatePost(async () => 'test-token', 'post_1', buildUndoPostedPayload());

    assert.equal(post.status, 'exported');
    assert.equal(post.manualPostedAt, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('client request errors stay safe for export actions', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: 'Approve this post before exporting.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });

  try {
    await assert.rejects(
      () => updatePost(async () => 'test-token', 'post_1', { status: 'exported' }),
      /Approve this post before exporting/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('client request errors hide raw serverless invocation failures', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: 'FUNCTION_INVOCATION_FAILED iad1::abc123' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });

  try {
    await assert.rejects(
      () =>
        generateCaption(async () => 'test-token', {
          business_id: '11111111-1111-4111-8111-111111111111',
          prompt_context: 'New cedar fence installation in Heber City',
          tone: 'professional',
          include_hashtags: true,
        }),
      (error) => {
        assert(error instanceof Error);
        assert.equal(error.message, 'Request failed (500).');
        assert.equal(error.message.includes('FUNCTION_INVOCATION_FAILED'), false);
        assert.equal(error.message.includes('iad1::abc123'), false);
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('local API adapter includes media upload routes before the media key catchall', () => {
  assert.deepEqual(resolveLocalApiRoutePath('/api/media/upload'), {
    modulePath: '/api/media/upload.ts',
    parseBody: false,
  });
  assert.deepEqual(resolveLocalApiRoutePath('/api/media/edited'), {
    modulePath: '/api/media/edited.ts',
    parseBody: false,
  });
  assert.deepEqual(
    resolveLocalApiRoutePath('/api/media/businesses%2Fbiz%2Fposts%2Fpost%2Ffile.png'),
    {
      modulePath: '/api/media/[key].ts',
      params: { key: 'businesses/biz/posts/post/file.png' },
      parseBody: false,
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
  assert.deepEqual(getAvailableStatusOptions('approved'), [
    'approved',
    'scheduled',
    'exported',
    'draft',
  ]);
  assert.deepEqual(getAvailableStatusOptions('scheduled'), ['scheduled', 'approved', 'exported']);
});

test('client upload validation rejects non-image files', () => {
  assert.throws(
    () => validateClientImageFile({ name: 'brief.pdf', size: 100, type: 'application/pdf' }),
    /JPEG, PNG, or WebP/,
  );
});

test('client upload validation rejects images over the Vercel request limit', () => {
  assert.throws(
    () =>
      validateClientImageFile({ name: 'large.jpg', size: 4 * 1024 * 1024 + 1, type: 'image/jpeg' }),
    /4MB or smaller/,
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
  assert.equal(
    getFinalMediaPreviewUrl({
      firstMedia: {
        blobUrl: 'https://blob.example/businesses/biz/posts/post/original.png',
      },
      finalMedia: {
        blobUrl: 'https://blob.example/businesses/biz/posts/post/edited.png',
      },
    }),
    'https://blob.example/businesses/biz/posts/post/edited.png',
  );
});

const queuePosts = [
  buildQueuePost({
    id: 'past',
    status: 'scheduled',
    scheduledAt: '2026-05-30T16:00:00.000Z',
  }),
  buildQueuePost({
    id: 'today',
    status: 'scheduled',
    scheduledAt: '2026-05-31T16:00:00.000Z',
  }),
  buildQueuePost({
    id: 'upcoming',
    status: 'scheduled',
    scheduledAt: '2026-06-02T16:00:00.000Z',
  }),
  buildQueuePost({
    id: 'exported',
    status: 'exported',
    scheduledAt: '2026-05-29T16:00:00.000Z',
    exportedAt: '2026-06-01T16:00:00.000Z',
    manualPostedAt: null,
  }),
];

test('calendar queue filters upcoming today past and exported posts', () => {
  const now = new Date('2026-05-31T12:00:00.000Z');
  const idsByFilter = (filter: CalendarQueueFilter) =>
    filterCalendarQueuePosts(queuePosts, filter, now).map((post) => post.id);

  assert.deepEqual(idsByFilter('today'), ['today']);
  assert.deepEqual(idsByFilter('past'), ['past']);
  assert.deepEqual(idsByFilter('upcoming'), ['today', 'upcoming']);
  assert.deepEqual(idsByFilter('exported'), ['exported']);
});

test('today queue keeps manually posted scheduled items visible as complete', () => {
  const now = new Date('2026-05-31T18:00:00.000Z');
  const postedToday = buildQueuePost({
    id: 'posted_today',
    status: 'exported',
    scheduledAt: '2026-05-31T16:00:00.000Z',
    exportedAt: '2026-05-31T17:00:00.000Z',
    manualPostedAt: '2026-05-31T17:15:00.000Z',
  });

  assert.deepEqual(
    filterCalendarQueuePosts([...queuePosts, postedToday], 'today', now).map((post) => post.id),
    ['today', 'posted_today'],
  );
});

test('today queue separates posted and unposted items with counts', () => {
  const now = new Date('2026-05-31T18:00:00.000Z');
  const postedToday = buildQueuePost({
    id: 'posted_today',
    status: 'exported',
    scheduledAt: '2026-05-31T16:00:00.000Z',
    exportedAt: '2026-05-31T17:00:00.000Z',
    manualPostedAt: '2026-05-31T17:15:00.000Z',
  });
  const sections = getTodayQueueSections([...queuePosts, postedToday], now);

  assert.deepEqual(
    sections.remaining.map((post) => post.id),
    ['today'],
  );
  assert.deepEqual(
    sections.posted.map((post) => post.id),
    ['posted_today'],
  );
  assert.equal(sections.remainingCount, 1);
  assert.equal(sections.postedCount, 1);
  assert.equal(sections.emptyState, 'none');
});

test('today queue moves restored scheduled item back to to-post section after undo', () => {
  const now = new Date('2026-05-31T18:00:00.000Z');
  const restoredToday = buildQueuePost({
    id: 'restored_today',
    status: 'scheduled',
    scheduledAt: '2026-05-31T16:00:00.000Z',
    exportedAt: null,
    manualPostedAt: null,
  });
  const sections = getTodayQueueSections([restoredToday], now);

  assert.deepEqual(
    sections.remaining.map((post) => post.id),
    ['restored_today'],
  );
  assert.deepEqual(sections.posted, []);
});

test('upcoming queue shows restored scheduled item after undo', () => {
  const now = new Date('2026-05-31T18:00:00.000Z');
  const restoredFuture = buildQueuePost({
    id: 'restored_future',
    status: 'scheduled',
    scheduledAt: '2026-06-02T16:00:00.000Z',
    exportedAt: null,
    manualPostedAt: null,
  });

  assert.deepEqual(
    filterCalendarQueuePosts([restoredFuture], 'upcoming', now).map((post) => post.id),
    ['restored_future'],
  );
});

test('today queue empty states distinguish no posts from all posted', () => {
  const now = new Date('2026-05-31T18:00:00.000Z');
  const postedToday = buildQueuePost({
    id: 'posted_today',
    status: 'exported',
    scheduledAt: '2026-05-31T16:00:00.000Z',
    exportedAt: '2026-05-31T17:00:00.000Z',
    manualPostedAt: '2026-05-31T17:15:00.000Z',
  });

  assert.equal(getTodayQueueSections([queuePosts[0], queuePosts[2]], now).emptyState, 'no-posts');
  assert.equal(getTodayQueueSections([postedToday], now).emptyState, 'all-posted');
  assert.equal(getTodayQueueEmptyState(0, 0), 'no-posts');
  assert.equal(getTodayQueueEmptyState(0, 2), 'all-posted');
  assert.equal(getTodayQueueEmptyState(1, 2), 'none');
});

test('exported queue sorts manually posted items by completion time', () => {
  const posted = buildQueuePost({
    id: 'posted',
    status: 'exported',
    exportedAt: '2026-05-31T17:00:00.000Z',
    manualPostedAt: '2026-06-02T17:15:00.000Z',
  });

  assert.deepEqual(
    filterCalendarQueuePosts([...queuePosts, posted], 'exported').map((post) => post.id),
    ['exported', 'posted'],
  );
});

test('calendar queue groups scheduled posts by date', () => {
  const groups = groupCalendarQueuePosts(
    filterCalendarQueuePosts(queuePosts, 'upcoming', new Date('2026-05-31T12:00:00.000Z')),
  );

  assert.deepEqual(
    groups.map((group) => ({
      dateKey: group.dateKey,
      postIds: group.posts.map((post) => post.id),
    })),
    [
      { dateKey: '2026-05-31', postIds: ['today'] },
      { dateKey: '2026-06-02', postIds: ['upcoming'] },
    ],
  );
});

test('calendar queue thumbnail prefers final edited media', () => {
  const post = buildQueuePost({
    firstMedia: {
      id: 'original',
      postId: 'post_1',
      blobUrl: 'https://blob.example/original.png',
      blobKey: 'original.png',
      mimeType: 'image/png',
      width: null,
      height: null,
      isEdited: false,
      originalUrl: null,
      createdAt: '2026-05-31T00:00:00.000Z',
      updatedAt: '2026-05-31T00:00:00.000Z',
    },
    finalMedia: {
      id: 'edited',
      postId: 'post_1',
      blobUrl: 'https://blob.example/edited.png',
      blobKey: 'edited.png',
      mimeType: 'image/png',
      width: 1080,
      height: 1080,
      isEdited: true,
      originalUrl: 'https://blob.example/original.png',
      createdAt: '2026-05-31T00:00:00.000Z',
      updatedAt: '2026-05-31T00:00:00.000Z',
    },
  });

  assert.equal(getQueueThumbnailUrl(post), 'https://blob.example/edited.png');
  assert.equal(canQueuePostExport(post), true);
  assert.equal(canQueuePostExport({ ...post, caption: '' }), false);
});

test('calendar queue recognizes manually posted completion state', () => {
  const posted = buildQueuePost({
    status: 'exported',
    exportedAt: '2026-05-31T17:00:00.000Z',
    manualPostedAt: '2026-05-31T17:15:00.000Z',
  });

  assert.equal(isQueuePostManuallyPosted(posted), true);
  assert.equal(isQueuePostManuallyPosted({ ...posted, manualPostedAt: null }), false);
});

test('calendar queue exposes completed styling classification for posted cards', () => {
  const posted = buildQueuePost({
    status: 'exported',
    exportedAt: '2026-05-31T17:00:00.000Z',
    manualPostedAt: '2026-05-31T17:15:00.000Z',
  });

  assert.equal(getQueuePostCompletionState(posted), 'complete');
  assert.equal(getQueuePostCompletionState({ ...posted, manualPostedAt: null }), 'open');
});

test('dashboard summary counts Phase 3 status metrics', () => {
  const now = new Date(2026, 5, 7, 12, 0, 0);
  const scheduledThisWeek = new Date(now);
  scheduledThisWeek.setDate(now.getDate() + 2);
  const scheduledNextWeek = new Date(now);
  scheduledNextWeek.setDate(now.getDate() + 8);

  const summary = buildDashboardSummary(
    [
      buildQueuePost({ id: 'draft_1', status: 'draft', scheduledAt: null }),
      buildQueuePost({ id: 'draft_2', status: 'draft', scheduledAt: null }),
      buildQueuePost({ id: 'review', status: 'ready_for_review', scheduledAt: null }),
      buildQueuePost({ id: 'approved', status: 'approved', scheduledAt: null }),
      buildQueuePost({
        id: 'scheduled_this_week',
        status: 'scheduled',
        scheduledAt: scheduledThisWeek.toISOString(),
      }),
      buildQueuePost({
        id: 'scheduled_next_week',
        status: 'scheduled',
        scheduledAt: scheduledNextWeek.toISOString(),
      }),
      buildQueuePost({
        id: 'exported',
        status: 'exported',
        scheduledAt: scheduledThisWeek.toISOString(),
        exportedAt: scheduledThisWeek.toISOString(),
      }),
    ],
    now,
  );

  assert.deepEqual(summary.metrics, {
    draftsInProgress: 2,
    postsAwaitingReview: 1,
    approvedReadyToExport: 1,
    scheduledThisWeek: 1,
  });
});

test('dashboard summary counts scheduled week in the business timezone', () => {
  const now = new Date('2026-06-07T05:30:00.000Z');
  const scheduledInNextDenverWeek = new Date('2026-06-07T06:30:00.000Z');
  const summary = buildDashboardSummary(
    [
      buildQueuePost({
        id: 'next_denver_week',
        status: 'scheduled',
        scheduledAt: scheduledInNextDenverWeek.toISOString(),
      }),
    ],
    now,
    'America/Denver',
  );

  assert.equal(summary.metrics.scheduledThisWeek, 0);
});

test('dashboard summary keeps the 10 most recently updated posts', () => {
  const now = new Date(2026, 5, 7, 12, 0, 0);
  const posts = Array.from({ length: 12 }, (_item, index) =>
    buildQueuePost({
      id: `post_${index}`,
      updatedAt: new Date(2026, 5, 1, index, 0, 0).toISOString(),
    }),
  );
  const summary = buildDashboardSummary(posts, now);

  assert.equal(summary.recentActivity.length, 10);
  assert.deepEqual(
    summary.recentActivity.map((post) => post.id),
    [
      'post_11',
      'post_10',
      'post_9',
      'post_8',
      'post_7',
      'post_6',
      'post_5',
      'post_4',
      'post_3',
      'post_2',
    ],
  );
});

test('dashboard summary returns the next five future scheduled posts', () => {
  const now = new Date(2026, 5, 7, 12, 0, 0);
  const hours = 60 * 60 * 1000;
  const scheduledPost = (id: string, offsetHours: number) =>
    buildQueuePost({
      id,
      status: 'scheduled',
      scheduledAt: new Date(now.getTime() + offsetHours * hours).toISOString(),
    });

  const summary = buildDashboardSummary(
    [
      scheduledPost('future_6', 6),
      scheduledPost('future_1', 1),
      scheduledPost('past', -1),
      buildQueuePost({
        id: 'approved_future',
        status: 'approved',
        scheduledAt: new Date(now.getTime() + hours).toISOString(),
      }),
      scheduledPost('future_3', 3),
      scheduledPost('future_5', 5),
      scheduledPost('future_2', 2),
      scheduledPost('future_4', 4),
    ],
    now,
  );

  assert.deepEqual(
    summary.upcomingScheduled.map((post) => post.id),
    ['future_1', 'future_2', 'future_3', 'future_4', 'future_5'],
  );
});

function buildQueuePost(overrides: Partial<PostSummary> = {}): PostSummary {
  return {
    id: 'post_1',
    businessId: 'business_1',
    status: 'scheduled' as const,
    caption: 'Finished cedar privacy fence.',
    hashtags: ['#FenceLife'],
    platformSize: '1080x1080',
    notes: null,
    aiGenerated: false,
    scheduledAt: '2026-05-31T16:00:00.000Z',
    exportedAt: null,
    manualPostedAt: null,
    createdAt: '2026-05-31T00:00:00.000Z',
    updatedAt: '2026-05-31T12:00:00.000Z',
    mediaCount: 1,
    firstMedia: {
      id: 'media_1',
      postId: 'post_1',
      blobUrl: 'https://blob.example/original.png',
      blobKey: 'original.png',
      mimeType: 'image/png',
      width: null,
      height: null,
      isEdited: false,
      originalUrl: null,
      createdAt: '2026-05-31T00:00:00.000Z',
      updatedAt: '2026-05-31T00:00:00.000Z',
    },
    finalMedia: null,
    ...overrides,
  };
}
