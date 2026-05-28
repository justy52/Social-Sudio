export type BusinessOwnershipRecord = {
  userId: string;
};

export type PostOwnershipRecord = {
  business: BusinessOwnershipRecord;
};

export type MediaOwnershipRecord = {
  post: PostOwnershipRecord;
};

export function isBusinessOwnedByUser(
  business: BusinessOwnershipRecord | null | undefined,
  userId: string,
) {
  return business?.userId === userId;
}

export function isPostOwnedByUser(post: PostOwnershipRecord | null | undefined, userId: string) {
  return isBusinessOwnedByUser(post?.business, userId);
}

export function isMediaOwnedByUser(media: MediaOwnershipRecord | null | undefined, userId: string) {
  return isPostOwnedByUser(media?.post, userId);
}
