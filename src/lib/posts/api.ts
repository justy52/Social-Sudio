import { ApiError } from '../api-helpers.ts';
import type { PostCreateInput, PostUpdateInput } from '../validation.ts';
import { canTransitionPostStatus, isPostStatus, type PostStatus } from './status.ts';

type OwnedBusiness = {
  userId: string;
};

type OwnedPost = {
  post: {
    status: string;
  };
  business: OwnedBusiness;
};

export type OwnedPostListRow<TPost> = {
  post: TPost;
  business: OwnedBusiness;
};

export function assertOwnedBusinessForPosts(
  business: OwnedBusiness | null | undefined,
  userId: string,
) {
  if (business?.userId !== userId) {
    throw new ApiError(404, 'Business not found');
  }
}

export function assertOwnedPostForPosts(post: OwnedPost | null | undefined, userId: string) {
  if (post?.business.userId !== userId) {
    throw new ApiError(404, 'Post not found');
  }
}

export function mapOwnedPostRows<TPost>(rows: OwnedPostListRow<TPost>[], userId: string) {
  return rows.filter((row) => row.business.userId === userId).map((row) => row.post);
}

export function buildCreatePostValues(input: PostCreateInput) {
  const values: {
    businessId: string;
    status: 'draft';
    caption?: string;
    hashtags?: string[];
    platformSize?: string;
    notes?: string;
    aiGenerated: boolean;
  } = {
    businessId: input.businessId,
    status: 'draft' as const,
    aiGenerated: input.aiGenerated ?? false,
  };

  if (input.caption !== undefined) values.caption = input.caption;
  if (input.hashtags !== undefined) values.hashtags = input.hashtags;
  if (input.platformSize !== undefined) values.platformSize = input.platformSize;
  if (input.notes !== undefined) values.notes = input.notes;

  return values;
}

export function buildUpdatePostValues(
  currentStatusValue: string,
  input: PostUpdateInput,
  now = new Date(),
) {
  const values: {
    caption?: string;
    hashtags?: string[];
    platformSize?: string;
    notes?: string;
    aiGenerated?: boolean;
    status?: PostStatus;
    exportedAt?: Date;
    updatedAt: Date;
  } = {
    updatedAt: now,
  };

  if (input.caption !== undefined) values.caption = input.caption;
  if (input.hashtags !== undefined) values.hashtags = input.hashtags;
  if (input.platformSize !== undefined) values.platformSize = input.platformSize;
  if (input.notes !== undefined) values.notes = input.notes;
  if (input.aiGenerated !== undefined) values.aiGenerated = input.aiGenerated;

  if (input.status !== undefined) {
    if (!isPostStatus(currentStatusValue)) {
      throw new ApiError(500, 'Post has an unsupported status');
    }

    if (!canTransitionPostStatus(currentStatusValue, input.status)) {
      throw new ApiError(
        400,
        `Invalid post status transition: ${currentStatusValue} -> ${input.status}`,
      );
    }

    if (input.status !== currentStatusValue) {
      values.status = input.status;

      if (input.status === 'exported') {
        values.exportedAt = now;
      }
    }
  }

  return values;
}
