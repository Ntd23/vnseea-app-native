export const IOS_LIVE_KEYBOARD_GAP = 8;

type ScreenDimensions = {
  width: number;
  height: number;
};

export function getStableLivePreviewDimensions(
  screen: ScreenDimensions,
): ScreenDimensions {
  return {
    width: Math.max(0, screen.width),
    height: Math.max(0, screen.height),
  };
}

export function getIosLiveKeyboardTranslation({
  screenHeight,
  keyboardScreenY,
  bottomInset,
}: {
  screenHeight: number;
  keyboardScreenY: number;
  bottomInset: number;
}) {
  const overlap = Math.max(0, screenHeight - keyboardScreenY);
  const translation = Math.max(0, overlap - Math.max(0, bottomInset));
  return translation === 0 ? 0 : -translation;
}
