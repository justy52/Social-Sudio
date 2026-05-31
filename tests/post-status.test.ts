import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertPostStatusTransition,
  canTransitionPostStatus,
  isPostStatus,
  postStatuses,
} from '../src/lib/posts/status.ts';

test('postStatuses exposes Phase 3 manual queue statuses only', () => {
  assert.deepEqual([...postStatuses], [
    'draft',
    'ready_for_review',
    'approved',
    'scheduled',
    'exported',
  ]);
  assert.equal(isPostStatus('scheduled'), true);
  assert.equal(isPostStatus('published'), false);
  assert.equal(isPostStatus('failed'), false);
});

test('canTransitionPostStatus allows the Phase 3 approval and scheduling flow', () => {
  assert.equal(canTransitionPostStatus('draft', 'ready_for_review'), true);
  assert.equal(canTransitionPostStatus('ready_for_review', 'approved'), true);
  assert.equal(canTransitionPostStatus('approved', 'scheduled'), true);
  assert.equal(canTransitionPostStatus('scheduled', 'approved'), true);
  assert.equal(canTransitionPostStatus('scheduled', 'exported'), true);
  assert.equal(canTransitionPostStatus('approved', 'exported'), true);
});

test('canTransitionPostStatus allows only approved backward edits', () => {
  assert.equal(canTransitionPostStatus('ready_for_review', 'draft'), true);
  assert.equal(canTransitionPostStatus('approved', 'draft'), true);
  assert.equal(canTransitionPostStatus('exported', 'draft'), false);
  assert.equal(canTransitionPostStatus('draft', 'scheduled'), false);
  assert.equal(canTransitionPostStatus('ready_for_review', 'scheduled'), false);
  assert.equal(canTransitionPostStatus('approved', 'ready_for_review'), false);
});

test('assertPostStatusTransition rejects invalid changes', () => {
  assert.throws(
    () => assertPostStatusTransition('draft', 'approved'),
    /Invalid post status transition: draft -> approved/,
  );
});
