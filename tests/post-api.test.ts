import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '../src/lib/api-helpers.ts';
import {
  assertOwnedBusinessForPosts,
  assertOwnedPostForPosts,
  buildCreatePostValues,
  buildUpdatePostValues,
  mapOwnedPostRows,
} from '../src/lib/posts/api.ts';
import { postCreateSchema, postUpdateSchema } from '../src/lib/validation.ts';

test('create post requires an owned business', () => {
  assert.doesNotThrow(() => assertOwnedBusinessForPosts({ userId: 'user_1' }, 'user_1'));
  assert.throws(() => assertOwnedBusinessForPosts({ userId: 'user_2' }, 'user_1'), ApiError);
  assert.throws(() => assertOwnedBusinessForPosts(null, 'user_1'), ApiError);
});

test('create post validation creates drafts only and rejects unsafe fields', () => {
  assert.throws(() =>
    postCreateSchema.parse({
      business_id: '11111111-1111-4111-8111-111111111111',
      caption: 'Launch day',
      status: 'approved',
    }),
  );
});

test('create post validation rejects client exported_at', () => {
  assert.throws(() =>
    postCreateSchema.parse({
      business_id: '11111111-1111-4111-8111-111111111111',
      exported_at: new Date().toISOString(),
    }),
  );
});

test('create post values force draft status', () => {
  const input = postCreateSchema.parse({
    business_id: '11111111-1111-4111-8111-111111111111',
    caption: 'Launch day',
  });

  assert.equal(buildCreatePostValues(input).status, 'draft');
});

test('list posts returns only authenticated user rows', () => {
  const rows = [
    { post: { id: 'post_1' }, business: { userId: 'user_1' } },
    { post: { id: 'post_2' }, business: { userId: 'user_2' } },
  ];

  assert.deepEqual(mapOwnedPostRows(rows, 'user_1'), [{ id: 'post_1' }]);
});

test('get update and delete require post ownership', () => {
  assert.doesNotThrow(() =>
    assertOwnedPostForPosts({ post: { status: 'draft' }, business: { userId: 'user_1' } }, 'user_1'),
  );
  assert.throws(
    () =>
      assertOwnedPostForPosts(
        { post: { status: 'draft' }, business: { userId: 'user_2' } },
        'user_1',
      ),
    ApiError,
  );
  assert.throws(() => assertOwnedPostForPosts(null, 'user_1'), ApiError);
});

test('invalid status transition is rejected', () => {
  const input = postUpdateSchema.parse({ status: 'approved' });

  assert.throws(
    () => buildUpdatePostValues('draft', input),
    /Invalid post status transition: draft -> approved/,
  );
});

test('valid status transition is accepted', () => {
  const input = postUpdateSchema.parse({ status: 'ready_for_review' });
  const values = buildUpdatePostValues('draft', input, new Date('2026-05-28T00:00:00.000Z'));

  assert.equal(values.status, 'ready_for_review');
  assert.equal(values.exportedAt, undefined);
});

test('exported_at is set server-side only when transitioning to exported', () => {
  assert.throws(() =>
    postUpdateSchema.parse({
      status: 'exported',
      exported_at: '2026-05-01T00:00:00.000Z',
    }),
  );
});

test('export transition sets exported_at server-side', () => {
  const now = new Date('2026-05-28T00:00:00.000Z');
  const input = postUpdateSchema.parse({ status: 'exported' });
  const values = buildUpdatePostValues('approved', input, now);

  assert.equal(values.status, 'exported');
  assert.equal(values.exportedAt, now);
});
