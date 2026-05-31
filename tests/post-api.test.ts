import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

test('manual posted migration adds nullable timestamp and business index', () => {
  const migration = readFileSync(
    new URL('../src/lib/db/migrations/0003_curvy_sheva_callister.sql', import.meta.url),
    'utf8',
  );

  assert.match(migration, /ADD COLUMN "manual_posted_at" timestamp with time zone/);
  assert.match(migration, /idx_posts_business_manual_posted/);
});

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

test('approved post can be scheduled with a future scheduled_at', () => {
  const now = new Date('2026-05-28T00:00:00.000Z');
  const scheduledAt = '2026-05-29T16:30:00.000Z';
  const input = postUpdateSchema.parse({
    status: 'scheduled',
    scheduled_at: scheduledAt,
  });
  const values = buildUpdatePostValues('approved', input, now);

  assert.equal(values.status, 'scheduled');
  assert.deepEqual(values.scheduledAt, new Date(scheduledAt));
  assert.equal(values.exportedAt, undefined);
});

test('approved to scheduled requires scheduled_at in the future', () => {
  const now = new Date('2026-05-28T00:00:00.000Z');

  assert.throws(
    () => buildUpdatePostValues('approved', postUpdateSchema.parse({ status: 'scheduled' }), now),
    /Choose a future date and time/,
  );
  assert.throws(
    () =>
      buildUpdatePostValues(
        'approved',
        postUpdateSchema.parse({
          status: 'scheduled',
          scheduled_at: '2026-05-27T16:30:00.000Z',
        }),
        now,
      ),
    /Choose a future date and time/,
  );
});

test('manual_posted_at is server-controlled only', () => {
  assert.throws(() =>
    postUpdateSchema.parse({
      manual_posted: true,
      manual_posted_at: '2026-05-01T00:00:00.000Z',
    }),
  );
});

test('draft to scheduled is rejected', () => {
  const input = postUpdateSchema.parse({
    status: 'scheduled',
    scheduled_at: '2026-05-29T16:30:00.000Z',
  });

  assert.throws(
    () => buildUpdatePostValues('draft', input, new Date('2026-05-28T00:00:00.000Z')),
    /Invalid post status transition: draft -> scheduled/,
  );
});

test('scheduled to approved clears scheduled_at', () => {
  const input = postUpdateSchema.parse({ status: 'approved' });
  const values = buildUpdatePostValues(
    'scheduled',
    input,
    new Date('2026-05-28T00:00:00.000Z'),
  );

  assert.equal(values.status, 'approved');
  assert.equal(values.scheduledAt, null);
});

test('scheduled post can be saved without rescheduling', () => {
  const input = postUpdateSchema.parse({ caption: 'Updated scheduled caption', status: 'scheduled' });
  const values = buildUpdatePostValues(
    'scheduled',
    input,
    new Date('2026-05-28T00:00:00.000Z'),
  );

  assert.equal(values.caption, 'Updated scheduled caption');
  assert.equal(values.status, undefined);
  assert.equal(values.scheduledAt, undefined);
});

test('scheduled to exported sets exported_at server-side and keeps schedule context', () => {
  const now = new Date('2026-05-28T00:00:00.000Z');
  const input = postUpdateSchema.parse({ status: 'exported' });
  const values = buildUpdatePostValues('scheduled', input, now);

  assert.equal(values.status, 'exported');
  assert.equal(values.exportedAt, now);
  assert.equal(values.scheduledAt, undefined);
});

test('scheduled manual posted action ends exported and sets server timestamps', () => {
  const now = new Date('2026-05-28T00:00:00.000Z');
  const input = postUpdateSchema.parse({ manual_posted: true });
  const values = buildUpdatePostValues('scheduled', input, now);

  assert.equal(values.status, 'exported');
  assert.equal(values.exportedAt, now);
  assert.equal(values.manualPostedAt, now);
});

test('exported manual posted action sets manual_posted_at without changing status', () => {
  const now = new Date('2026-05-28T00:00:00.000Z');
  const input = postUpdateSchema.parse({ manual_posted: true });
  const values = buildUpdatePostValues('exported', input, now);

  assert.equal(values.status, undefined);
  assert.equal(values.exportedAt, undefined);
  assert.equal(values.manualPostedAt, now);
});

test('draft review and approved posts cannot be marked manually posted', () => {
  const input = postUpdateSchema.parse({ manual_posted: true });

  assert.throws(() => buildUpdatePostValues('draft', input), /Export or schedule/);
  assert.throws(() => buildUpdatePostValues('ready_for_review', input), /Export or schedule/);
  assert.throws(() => buildUpdatePostValues('approved', input), /Export or schedule/);
});

test('undo manual posted clears timestamp and leaves exported status unchanged', () => {
  const input = postUpdateSchema.parse({ manual_posted: false });
  const values = buildUpdatePostValues('exported', input, new Date('2026-05-28T00:00:00.000Z'));

  assert.equal(values.status, undefined);
  assert.equal(values.manualPostedAt, null);
});
