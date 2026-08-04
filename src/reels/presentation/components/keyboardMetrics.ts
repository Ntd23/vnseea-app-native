// Description: Normalizes Android IME frames across OEM keyboards and window modes.
export interface KeyboardFrameLike {
  height?: number | null;
  screenY?: number | null;
}

// Keep navigation/gesture bars from being mistaken for a full IME when an
// OEM reports a stale screenY near the bottom of the display.
const MIN_PLAUSIBLE_KEYBOARD_HEIGHT = 160;
const MAX_PLAUSIBLE_KEYBOARD_FRACTION = 0.8;

function positiveFinite(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, value)
    : 0;
}

/**
 * Resolves the IME height without trusting Android's reported `height` alone.
 *
 * A few Android IMEs/OEM window managers emit a stale (or zero) height while
 * `screenY` already points at the new IME boundary. The screen coordinate is
 * therefore used as the source of truth whenever it describes a plausible
 * bottom-anchored keyboard; otherwise the reported/fallback height is kept.
 */
export function resolveKeyboardHeightFromFrame(
  frame: KeyboardFrameLike | undefined,
  screenHeight: number,
  fallbackHeight = 0,
): number {
  const normalizedScreenHeight = positiveFinite(screenHeight);
  const reportedHeight = positiveFinite(frame?.height);
  const reportedScreenY = positiveFinite(frame?.screenY);
  const screenDerivedHeight =
    normalizedScreenHeight > 0 &&
    reportedScreenY > 0 &&
    reportedScreenY < normalizedScreenHeight
      ? normalizedScreenHeight - reportedScreenY
      : 0;
  const fallback = positiveFinite(fallbackHeight);

  const derivedHeightIsPlausible =
    screenDerivedHeight >= MIN_PLAUSIBLE_KEYBOARD_HEIGHT &&
    screenDerivedHeight <=
      normalizedScreenHeight * MAX_PLAUSIBLE_KEYBOARD_FRACTION;

  if (derivedHeightIsPlausible) {
    // Prefer the current frame over a possibly stale fallback from the prior
    // keyboard layout, while keeping any taller height reported by this same
    // frame (for example an OEM accessory row).
    return Math.round(Math.max(screenDerivedHeight, reportedHeight));
  }

  return Math.round(Math.max(reportedHeight, fallback));
}

export function resolveKeyboardScreenY(
  frame: KeyboardFrameLike | undefined,
  screenHeight: number,
  resolvedHeight: number,
): number | null {
  const normalizedScreenHeight = positiveFinite(screenHeight);
  const normalizedHeight = positiveFinite(resolvedHeight);
  const reportedScreenY = positiveFinite(frame?.screenY);
  if (
    normalizedScreenHeight > 0 &&
    reportedScreenY > 0 &&
    reportedScreenY < normalizedScreenHeight
  ) {
    const fallbackScreenY =
      normalizedHeight > 0
        ? Math.max(0, normalizedScreenHeight - normalizedHeight)
        : reportedScreenY;
    // Use the higher (smaller Y) boundary when the two Android sources
    // disagree. This prevents a stale screenY near the navigation bar from
    // hiding part of the composer under the keyboard.
    return Math.round(Math.min(reportedScreenY, fallbackScreenY));
  }

  if (normalizedScreenHeight > 0 && normalizedHeight > 0) {
    return Math.round(Math.max(0, normalizedScreenHeight - normalizedHeight));
  }

  return null;
}

export function resolveKeyboardOverlap(
  panelBottom: number,
  keyboardTop: number,
): number {
  const normalizedPanelBottom = positiveFinite(panelBottom);
  const normalizedKeyboardTop = positiveFinite(keyboardTop);
  return Math.max(0, Math.ceil(normalizedPanelBottom - normalizedKeyboardTop));
}
