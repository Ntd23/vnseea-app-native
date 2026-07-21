export const CHAT_MEDIA_DISMISS_DISTANCE = 120;
export const CHAT_MEDIA_DISMISS_VELOCITY = 900;

export function getChatMediaDismissTranslation(translationY: number): number {
  'worklet';
  return Math.max(0, translationY);
}

export function shouldDismissChatMedia(
  translationY: number,
  velocityY: number,
): boolean {
  'worklet';
  if (translationY < 0 || velocityY < 0) return false;
  return (
    translationY >= CHAT_MEDIA_DISMISS_DISTANCE ||
    velocityY >= CHAT_MEDIA_DISMISS_VELOCITY
  );
}
