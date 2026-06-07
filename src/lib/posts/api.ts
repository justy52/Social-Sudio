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
  currentPost: { scheduledAt?: Date | string | null } = {},
) {
  const values: {
    caption?: string;
    hashtags?: string[];
    platformSize?: string;
    notes?: string;
    aiGenerated?: boolean;
    status?: PostStatus;
    scheduledAt?: Date | null;
    exportedAt?: Date | null;
    manualPostedAt?: Date | null;
    archivedAt?: Date | null;
    updatedAt: Date;
  } = {
    updatedAt: now,
  };

  if (input.caption !== undefined) values.caption = input.caption;
  if (input.hashtags !== undefined) values.hashtags = input.hashtags;
  if (input.platformSize !== undefined) values.platformSize = input.platformSize;
  if (input.notes !== undefined) values.notes = input.notes;
  if (input.aiGenerated !== undefined) values.aiGenerated = input.aiGenerated;
  if (input.archived !== undefined) values.archivedAt = input.archived ? now : null;

  if (input.manualPosted !== undefined) {
    if (!isPostStatus(currentStatusValue)) {
      throw new ApiError(500, 'Post has an unsupported status');
    }

    if (input.manualPosted) {
      if (currentStatusValue === 'scheduled') {
        values.status = 'exported';
        values.exportedAt = now;
        values.manualPostedAt = now;
        return values;
      }

      if (currentStatusValue === 'exported') {
        values.manualPostedAt = now;
        return values;
      }

      throw new ApiError(400, 'Export or schedule this post before marking it posted.');
    }

    if (currentStatusValue !== 'exported') {
      throw new ApiError(400, 'Only exported posts can clear posted completion.');
    }

    values.manualPostedAt = null;
    if (currentPost.scheduledAt) {
      values.status = 'scheduled';
      values.exportedAt = null;
    }
    return values;
  }

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

    if (input.status === 'scheduled' && currentStatusValue !== 'scheduled') {
      if (currentStatusValue !== 'approved') {
        throw new ApiError(400, 'Only approved posts can be scheduled.');
      }

      if (!input.scheduledAt) {
        throw new ApiError(400, 'Choose a future date and time.');
      }

      if (input.scheduledAt <= now) {
        throw new ApiError(400, 'Choose a future date and time.');
      }
    }

    if (input.status !== currentStatusValue) {
      values.status = input.status;

      if (input.status === 'exported') {
        values.exportedAt = now;
      }

      if (currentStatusValue === 'scheduled' && input.status === 'approved') {
        values.scheduledAt = null;
      }
    }
  }

  if (input.scheduledAt !== undefined) {
    if (
      input.scheduledAt === null &&
      currentStatusValue === 'scheduled' &&
      input.status === 'approved'
    ) {
      values.scheduledAt = null;
      return values;
    }

    if (input.status !== 'scheduled') {
      throw new ApiError(400, 'Choose a future date and time.');
    }

    if (input.scheduledAt !== null && input.scheduledAt <= now) {
      throw new ApiError(400, 'Choose a future date and time.');
    }

    values.scheduledAt = input.scheduledAt;
  }

  return values;
}
