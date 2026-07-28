type InlineLiveViewToken = {
  isViewable?: boolean;
  item?: {
    type?: string;
    item?: {
      postId?: number;
      state?: string;
    };
  };
};

export function pickInlineLivePostId(
  viewableItems: readonly InlineLiveViewToken[],
) {
  const candidate = viewableItems.find(
    token =>
      token?.isViewable &&
      token.item?.type === 'live' &&
      token.item.item?.state === 'live' &&
      Number.isFinite(token.item.item?.postId),
  );

  return candidate?.item?.item?.postId ?? null;
}

export function isInlineLivePostIdViewable(
  viewableItems: readonly InlineLiveViewToken[],
  postId: number | null,
) {
  if (!postId) return false;
  return viewableItems.some(
    token =>
      token?.isViewable &&
      token.item?.type === 'live' &&
      token.item.item?.state === 'live' &&
      token.item.item?.postId === postId,
  );
}
