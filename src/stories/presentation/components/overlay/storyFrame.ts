// Description: Fits the shared 9:16 story frame that overlay positions and sizes are measured against.

export const STORY_FRAME_ASPECT = 9 / 16;
/** Overlay sizes are designed for a 375pt-wide frame and scale with it. */
const STORY_FRAME_DESIGN_WIDTH = 375;

export type StoryFrameRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/**
 * The largest centred 9:16 frame inside a container. The editor and the viewer
 * both show media with "contain" inside such a frame, so an overlay stored as
 * a fraction of it lands on the same spot of the photo on every screen.
 */
export function fitStoryFrame(
  containerWidth: number,
  containerHeight: number,
): StoryFrameRect {
  if (!(containerWidth > 0) || !(containerHeight > 0)) {
    return { left: 0, top: 0, width: 0, height: 0 };
  }
  const width = Math.min(containerWidth, containerHeight * STORY_FRAME_ASPECT);
  const height = width / STORY_FRAME_ASPECT;
  return {
    left: (containerWidth - width) / 2,
    top: (containerHeight - height) / 2,
    width,
    height,
  };
}

/** Multiplier for overlay font and padding sizes so they keep their proportion to the frame. */
export function storyFrameUnit(frame: StoryFrameRect) {
  return frame.width / STORY_FRAME_DESIGN_WIDTH;
}
