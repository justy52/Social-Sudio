import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import test from 'node:test';
import { ApiError } from '../src/lib/api-helpers.ts';
import {
  assertMediaUploadAuthenticated,
  assertOwnedMediaForDelete,
  assertOwnedPostForMediaUpload,
  assertValidImageUpload,
  buildBlobUploadErrorMessage,
  deletePostMedia,
  getBlobStorageAuth,
  maxImageUploadBytes,
  readSafeBlobError,
  requireBlobStorageAuth,
  sanitizeFileName,
  uploadPostMedia,
  type BlobStorageAdapter,
  type MediaUploadFile,
} from '../src/lib/media/api.ts';
import { parseMultipartFormData } from '../src/lib/media/multipart.ts';
import { editedMediaUploadFieldsSchema } from '../src/lib/validation.ts';

function imageFile(overrides: Partial<MediaUploadFile> = {}): MediaUploadFile {
  const buffer = Buffer.from('image-bytes');

  return {
    fileName: 'Launch Photo.PNG',
    mimeType: 'image/png',
    size: buffer.byteLength,
    buffer,
    ...overrides,
  };
}

function storageMock(overrides: Partial<BlobStorageAdapter> = {}): BlobStorageAdapter {
  return {
    async put(pathname) {
      return { url: `https://blob.example/${pathname}`, pathname };
    },
    async del() {},
    ...overrides,
  };
}

async function withBlobEnv<T>(
  env: {
    BLOB_READ_WRITE_TOKEN?: string;
    VERCEL_OIDC_TOKEN?: string;
    BLOB_STORE_ID?: string;
  },
  fn: () => T | Promise<T>,
) {
  const previous = {
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    VERCEL_OIDC_TOKEN: process.env.VERCEL_OIDC_TOKEN,
    BLOB_STORE_ID: process.env.BLOB_STORE_ID,
  };

  setOptionalEnv('BLOB_READ_WRITE_TOKEN', env.BLOB_READ_WRITE_TOKEN);
  setOptionalEnv('VERCEL_OIDC_TOKEN', env.VERCEL_OIDC_TOKEN);
  setOptionalEnv('BLOB_STORE_ID', env.BLOB_STORE_ID);

  try {
    return await fn();
  } finally {
    setOptionalEnv('BLOB_READ_WRITE_TOKEN', previous.BLOB_READ_WRITE_TOKEN);
    setOptionalEnv('VERCEL_OIDC_TOKEN', previous.VERCEL_OIDC_TOKEN);
    setOptionalEnv('BLOB_STORE_ID', previous.BLOB_STORE_ID);
  }
}

function setOptionalEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

test('upload requires auth', () => {
  assert.doesNotThrow(() => assertMediaUploadAuthenticated('user_1'));
  assert.throws(() => assertMediaUploadAuthenticated(null), ApiError);
});

test('upload requires an owned post', () => {
  const context = { post: { id: 'post_1', businessId: 'business_1' }, business: { id: 'business_1' } };

  assert.doesNotThrow(() => assertOwnedPostForMediaUpload(context, 'post_1'));
  assert.throws(() => assertOwnedPostForMediaUpload(context, 'post_2'), ApiError);
  assert.throws(
    () =>
      assertOwnedPostForMediaUpload(
        { post: { id: 'post_1', businessId: 'business_2' }, business: { id: 'business_1' } },
        'post_1',
      ),
    ApiError,
  );
});

test('upload rejects non-image MIME types', () => {
  assert.throws(
    () => assertValidImageUpload(imageFile({ mimeType: 'application/pdf' })),
    /JPEG, PNG, or WebP/,
  );
  assert.throws(
    () => assertValidImageUpload(imageFile({ mimeType: 'image/heic' })),
    /HEIC and HEIF are not supported/,
  );
  assert.throws(
    () => assertValidImageUpload(imageFile({ mimeType: 'video/mp4' })),
    /JPEG, PNG, or WebP/,
  );
});

test('upload rejects files over the MVP size limit', () => {
  assert.throws(
    () => assertValidImageUpload(imageFile({ size: maxImageUploadBytes + 1 })),
    ApiError,
  );
});

test('multipart parser reads post_id and file from a stream request', async () => {
  const boundary = 'social-studio-boundary';
  const body = Buffer.from(
    [
      `--${boundary}`,
      'Content-Disposition: form-data; name="post_id"',
      '',
      '11111111-1111-4111-8111-111111111111',
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="launch.png"',
      'Content-Type: image/png',
      '',
      'image-bytes',
      `--${boundary}--`,
      '',
    ].join('\r\n'),
    'binary',
  );
  const req = new PassThrough() as PassThrough & {
    method?: string;
    headers: Record<string, string>;
    body?: unknown;
  };
  req.method = 'POST';
  req.headers = {
    'content-type': `multipart/form-data; boundary=${boundary}`,
    'content-length': String(body.byteLength),
  };

  req.end(body);

  const form = await parseMultipartFormData(req as never);

  assert.deepEqual(Object.keys(form.fields), ['post_id']);
  assert.equal(form.fields.post_id, '11111111-1111-4111-8111-111111111111');
  assert.deepEqual(Object.keys(form.files), ['file']);
  assert.equal(form.files.file.fileName, 'launch.png');
  assert.equal(form.files.file.mimeType, 'image/png');
  assert.equal(form.files.file.size, Buffer.byteLength('image-bytes'));
});

test('upload creates post_media only after storage success', async () => {
  const calls: string[] = [];
  const media = await uploadPostMedia({
    token: 'blob-token',
    postId: 'post_1',
    file: imageFile(),
    id: 'media-file-id',
    context: { post: { id: 'post_1', businessId: 'business_1' }, business: { id: 'business_1' } },
    storage: storageMock({
      async put(pathname, _body, options) {
        calls.push('blob');
        assert.equal(options.contentType, 'image/png');
        assert.equal(options.token, 'blob-token');
        assert.equal(options.oidcToken, undefined);
        assert.equal(options.storeId, undefined);
        assert.equal(pathname, 'businesses/business_1/posts/post_1/media-file-id-launch-photo.png');
        return { url: `https://blob.example/${pathname}`, pathname };
      },
    }),
    async createMediaRecord(record) {
      calls.push('db');
      assert.equal(record.postId, 'post_1');
      assert.equal(record.blobKey, 'businesses/business_1/posts/post_1/media-file-id-launch-photo.png');
      assert.equal(record.isEdited, false);
      assert.equal(record.originalUrl, null);
      return { id: 'media_1', ...record };
    },
  });

  assert.deepEqual(calls, ['blob', 'db']);
  assert.equal(media.id, 'media_1');
});

test('upload can use OIDC credentials when no read-write token is provided', async () => {
  await withBlobEnv(
    {
      BLOB_READ_WRITE_TOKEN: undefined,
      VERCEL_OIDC_TOKEN: 'oidc-token',
      BLOB_STORE_ID: 'store_public',
    },
    async () => {
      const media = await uploadPostMedia({
        token: undefined,
        postId: 'post_1',
        file: imageFile(),
        id: 'oidc-id',
        context: {
          post: { id: 'post_1', businessId: 'business_1' },
          business: { id: 'business_1' },
        },
        storage: storageMock({
          async put(pathname, _body, options) {
            assert.equal(options.token, undefined);
            assert.equal(options.oidcToken, 'oidc-token');
            assert.equal(options.storeId, 'store_public');
            return { url: `https://blob.example/${pathname}`, pathname };
          },
        }),
        async createMediaRecord(record) {
          assert.equal(record.isEdited, false);
          return { id: 'media_oidc', ...record };
        },
      });

      assert.equal(media.id, 'media_oidc');
    },
  );
});

test('OIDC credentials are preferred when both Blob auth modes are present', () => {
  assert.deepEqual(
    getBlobStorageAuth({
      BLOB_READ_WRITE_TOKEN: 'old-token',
      VERCEL_OIDC_TOKEN: 'oidc-token',
      BLOB_STORE_ID: 'store_public',
    }),
    {
      token: undefined,
      oidcToken: 'oidc-token',
      storeId: 'store_public',
      mode: 'oidc',
      hasReadWriteToken: true,
      hasOidcToken: true,
      hasBlobStoreId: true,
      hasUsableCredentials: true,
    },
  );
});

test('read-write token remains supported when OIDC credentials are absent', () => {
  assert.deepEqual(
    getBlobStorageAuth({
      BLOB_READ_WRITE_TOKEN: 'blob-token',
      VERCEL_OIDC_TOKEN: undefined,
      BLOB_STORE_ID: undefined,
    }),
    {
      token: 'blob-token',
      oidcToken: undefined,
      storeId: undefined,
      mode: 'token',
      hasReadWriteToken: true,
      hasOidcToken: false,
      hasBlobStoreId: false,
      hasUsableCredentials: true,
    },
  );
});

test('edited upload fields require post id and render dimensions', () => {
  const fields = editedMediaUploadFieldsSchema.parse({
    post_id: '11111111-1111-4111-8111-111111111111',
    width: '1080',
    height: '1350',
    original_url: 'https://blob.example/original.png',
  });

  assert.deepEqual(fields, {
    postId: '11111111-1111-4111-8111-111111111111',
    width: 1080,
    height: 1350,
    originalUrl: 'https://blob.example/original.png',
  });
  assert.throws(() =>
    editedMediaUploadFieldsSchema.parse({
      post_id: 'not-a-post-id',
      width: '0',
      height: '1350',
    }),
  );
});

test('edited upload marks media as edited and keeps render metadata', async () => {
  const media = await uploadPostMedia({
    token: 'blob-token',
    postId: 'post_1',
    file: imageFile({ fileName: 'Edited.png' }),
    id: 'edited-id',
    context: { post: { id: 'post_1', businessId: 'business_1' }, business: { id: 'business_1' } },
    storage: storageMock(),
    isEdited: true,
    originalUrl: 'https://blob.example/original.png',
    width: 1080,
    height: 1350,
    async createMediaRecord(record) {
      assert.equal(record.isEdited, true);
      assert.equal(record.originalUrl, 'https://blob.example/original.png');
      assert.equal(record.width, 1080);
      assert.equal(record.height, 1350);
      assert.equal(record.blobKey, 'businesses/business_1/posts/post_1/edited-id-edited.png');
      return { id: 'media_edited', ...record };
    },
  });

  assert.equal(media.id, 'media_edited');
});

test('upload does not create post_media when storage fails', async () => {
  let createCalls = 0;

  await assert.rejects(
    () =>
      uploadPostMedia({
        token: 'blob-token',
        postId: 'post_1',
        file: imageFile(),
        context: {
          post: { id: 'post_1', businessId: 'business_1' },
          business: { id: 'business_1' },
        },
        storage: storageMock({
          async put() {
            throw new Error('raw storage failure');
          },
        }),
        async createMediaRecord(record) {
          createCalls += 1;
          return { id: 'media_1', ...record };
        },
      }),
    /Blob storage upload failed/,
  );

  assert.equal(createCalls, 0);
});

test('blob upload errors are safely classified for local troubleshooting', () => {
  assert.equal(
    buildBlobUploadErrorMessage({
      name: 'Error',
      message: 'Vercel Blob: Cannot use public access on a private store.',
      status: null,
    }),
    'Blob upload failed: this Blob store is private, but Social Studio needs public Blob storage for image previews.',
  );
  assert.equal(
    buildBlobUploadErrorMessage({
      name: 'Error',
      message: 'Vercel Blob: This store does not exist.',
      status: null,
    }),
    'Blob upload failed: Blob store was not found. Check BLOB_STORE_ID and the Vercel Blob project connection.',
  );
  assert.equal(
    buildBlobUploadErrorMessage({
      name: 'Error',
      message: 'Unauthorized',
      status: 401,
    }),
    'Blob upload failed: unauthorized token.',
  );
  assert.equal(
    buildBlobUploadErrorMessage({
      name: 'Error',
      message: 'Vercel Blob: OIDC is enabled for this project, but not for the "development" environment.',
      status: null,
    }),
    'Blob upload failed: OIDC is not enabled for local development. Test uploads in Vercel Preview or use a read-write Blob token for local uploads.',
  );
  assert.equal(
    buildBlobUploadErrorMessage({
      name: 'Error',
      message: 'Invalid request',
      status: 400,
    }),
    'Blob upload failed: invalid request.',
  );
  assert.deepEqual(readSafeBlobError(new Error('boom')), {
    name: 'Error',
    message: 'boom',
    status: null,
  });
});

test('delete requires media ownership', () => {
  const context = {
    media: { id: 'media_1', blobKey: 'businesses/business_1/posts/post_1/file.png' },
    business: { userId: 'user_1' },
  };

  assert.doesNotThrow(() => assertOwnedMediaForDelete(context, 'user_1'));
  assert.throws(() => assertOwnedMediaForDelete(context, 'user_2'), ApiError);
});

test('delete removes media record after blob delete success', async () => {
  const calls: string[] = [];
  const result = await deletePostMedia({
    token: 'blob-token',
    media: { id: 'media_1', blobKey: 'businesses/business_1/posts/post_1/file.png' },
    storage: storageMock({
      async del(pathname) {
        calls.push('blob');
        assert.equal(pathname, 'businesses/business_1/posts/post_1/file.png');
      },
    }),
    async deleteMediaRecord(mediaId) {
      calls.push('db');
      assert.equal(mediaId, 'media_1');
    },
  });

  assert.deepEqual(calls, ['blob', 'db']);
  assert.deepEqual(result, { deleted: true });
});

test('missing token and OIDC credentials returns a clear error', async () => {
  assert.deepEqual(
    getBlobStorageAuth({
      BLOB_READ_WRITE_TOKEN: undefined,
      VERCEL_OIDC_TOKEN: undefined,
      BLOB_STORE_ID: undefined,
    }),
    {
      token: undefined,
      oidcToken: undefined,
      storeId: undefined,
      mode: 'none',
      hasReadWriteToken: false,
      hasOidcToken: false,
      hasBlobStoreId: false,
      hasUsableCredentials: false,
    },
  );

  assert.throws(
    () =>
      requireBlobStorageAuth(
        getBlobStorageAuth({
          BLOB_READ_WRITE_TOKEN: undefined,
          VERCEL_OIDC_TOKEN: 'oidc-token',
          BLOB_STORE_ID: undefined,
        }),
      ),
    /Blob storage is not configured/,
  );

  await withBlobEnv(
    {
      BLOB_READ_WRITE_TOKEN: undefined,
      VERCEL_OIDC_TOKEN: undefined,
      BLOB_STORE_ID: undefined,
    },
    async () => {
      await assert.rejects(
        () =>
          uploadPostMedia({
            token: undefined,
            postId: 'post_1',
            file: imageFile(),
            context: {
              post: { id: 'post_1', businessId: 'business_1' },
              business: { id: 'business_1' },
            },
            storage: storageMock(),
            async createMediaRecord(record) {
              return { id: 'media_1', ...record };
            },
          }),
        /Blob storage is not configured/,
      );
    },
  );
});

test('sanitizeFileName keeps blob keys namespaced and safe', () => {
  assert.equal(sanitizeFileName('../My Launch Photo!.PNG'), 'my-launch-photo-.png');
});
