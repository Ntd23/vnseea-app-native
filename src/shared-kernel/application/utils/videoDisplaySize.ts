// Description: Turns the size a picker reports for a video into its upright display size, using a frame rendered upright.

export type VideoSize = { width?: number; height?: number };

/**
 * iOS pickers report the stored track size, so a portrait iPhone recording
 * (stored 1920x1080 with a 90° rotation flag) comes back landscape and feeds
 * squeeze it into a landscape box. Thumbnail frames are rendered upright, so
 * when the two disagree on orientation the picker size is swapped. Without a
 * usable frame the picker size is kept as it is.
 */
export function orientVideoSize(picked: VideoSize, frame?: VideoSize): VideoSize {
  const width = Number(picked.width);
  const height = Number(picked.height);
  const frameWidth = Number(frame?.width);
  const frameHeight = Number(frame?.height);
  const hasFrame = frameWidth > 0 && frameHeight > 0 && frameWidth !== frameHeight;
  if (!(width > 0 && height > 0)) {
    // The frame is small, but its aspect ratio is what feeds lay out by.
    return hasFrame ? { width: frameWidth, height: frameHeight } : picked;
  }
  if (hasFrame && width !== height && width > height !== frameWidth > frameHeight) {
    return { width: height, height: width };
  }
  return { width, height };
}
