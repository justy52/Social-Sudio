import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isBusinessOwnedByUser,
  isMediaOwnedByUser,
  isPostOwnedByUser,
} from '../src/lib/posts/ownership.ts';

test('business ownership predicate matches the authenticated user', () => {
  assert.equal(isBusinessOwnedByUser({ userId: 'user_123' }, 'user_123'), true);
  assert.equal(isBusinessOwnedByUser({ userId: 'user_123' }, 'user_456'), false);
});

test('post ownership is inherited through the business owner', () => {
  const post = { business: { userId: 'user_123' } };

  assert.equal(isPostOwnedByUser(post, 'user_123'), true);
  assert.equal(isPostOwnedByUser(post, 'user_456'), false);
});

test('media ownership is inherited through post and business ownership', () => {
  const media = { post: { business: { userId: 'user_123' } } };

  assert.equal(isMediaOwnedByUser(media, 'user_123'), true);
  assert.equal(isMediaOwnedByUser(media, 'user_456'), false);
});
