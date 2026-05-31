import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '../src/lib/api-helpers.ts';
import {
  assertMediaUploadAuthenticated,
  assertOwnedMediaForDelete,
  assertOwnedPostForMediaUpload,
  assertValidImageUpload,
  deletePostMedia,
  maxImageUploadBytes,
  requireBlobReadWriteToken,
  sanitizeFileName,
  uploadPostMedia,
  type BlobStorageAdapter,
  type MediaUploadFile,
} from '../src/lib/media/api.ts';
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

test('missing BLOB_READ_WRITE_TOKEN returns a clear error', async () => {
  assert.throws(() => requireBlobReadWriteToken(undefined), /Blob storage is not configured/);

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
});

test('sanitizeFileName keeps blob keys namespaced and safe', () => {
  assert.equal(sanitizeFileName('../My Launch Photo!.PNG'), 'my-launch-photo-.png');
});
