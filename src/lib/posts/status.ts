export const postStatuses = ['draft', 'ready_for_review', 'approved', 'exported'] as const;

export type PostStatus = (typeof postStatuses)[number];

export const allowedPostStatusTransitions: Record<PostStatus, readonly PostStatus[]> = {
  draft: ['ready_for_review'],
  ready_for_review: ['approved', 'draft'],
  approved: ['exported', 'draft'],
  exported: [],
};

export function isPostStatus(value: string): value is PostStatus {
  return postStatuses.includes(value as PostStatus);
}

export function canTransitionPostStatus(from: PostStatus, to: PostStatus) {
  if (from === to) {
    return true;
  }

  return allowedPostStatusTransitions[from].includes(to);
}

export function assertPostStatusTransition(from: PostStatus, to: PostStatus) {
  if (!canTransitionPostStatus(from, to)) {
    throw new Error(`Invalid post status transition: ${from} -> ${to}`);
  }
}
