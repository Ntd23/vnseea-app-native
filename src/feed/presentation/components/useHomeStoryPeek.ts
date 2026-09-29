// Description: Tracks the press-and-hold story preview on the home rail.
import { useCallback, useRef, useState } from 'react';
import type { StoryItem } from '../../../stories/domain/types/stories.types';

export const HOME_STORY_PEEK_DELAY_MS = 300;
// A release this soon after opening is the platform cancelling the press as
// the preview appears (iOS), not the user letting go.
export const HOME_STORY_PEEK_RELEASE_GRACE_MS = 250;

type StoryPeek = { story: StoryItem; index: number };

/** Opens on long press, closes when the finger lifts, and can open the full viewer. */
export function useHomeStoryPeek(openViewer: (index: number) => void) {
  const [peek, setPeek] = useState<StoryPeek | null>(null);
  const openedAtRef = useRef(0);

  const openPeek = useCallback((story: StoryItem, index: number) => {
    openedAtRef.current = Date.now();
    setPeek({ story, index });
  }, []);

  const releasePeek = useCallback(() => {
    if (Date.now() - openedAtRef.current < HOME_STORY_PEEK_RELEASE_GRACE_MS) {
      return;
    }
    setPeek(null);
  }, []);

  const closePeek = useCallback(() => setPeek(null), []);

  const openPeekedStory = useCallback(() => {
    setPeek(null);
    if (peek) openViewer(peek.index);
  }, [openViewer, peek]);

  return { peek, openPeek, releasePeek, closePeek, openPeekedStory };
}
