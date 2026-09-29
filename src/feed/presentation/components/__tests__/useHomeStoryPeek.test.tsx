import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import type { StoryItem } from '../../../../stories/domain/types/stories.types';
import {
  HOME_STORY_PEEK_RELEASE_GRACE_MS,
  useHomeStoryPeek,
} from '../useHomeStoryPeek';

const story = { id: 'story-1', publisher: { name: 'Lê Ngọc Anh' } } as StoryItem;

function renderPeek(openViewer: (index: number) => void) {
  let current!: ReturnType<typeof useHomeStoryPeek>;
  function Probe() {
    current = useHomeStoryPeek(openViewer);
    return null;
  }
  act(() => {
    TestRenderer.create(<Probe />);
  });
  return () => current;
}

describe('useHomeStoryPeek', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('opens on long press and closes when the finger lifts', () => {
    const peek = renderPeek(jest.fn());

    act(() => peek().openPeek(story, 2));
    expect(peek().peek).toEqual({ story, index: 2 });

    act(() => {
      jest.advanceTimersByTime(HOME_STORY_PEEK_RELEASE_GRACE_MS + 50);
      peek().releasePeek();
    });
    expect(peek().peek).toBeNull();
  });

  it('keeps the preview open when the press is cancelled as it appears', () => {
    const peek = renderPeek(jest.fn());

    act(() => peek().openPeek(story, 0));
    act(() => peek().releasePeek());

    expect(peek().peek).toEqual({ story, index: 0 });
    act(() => peek().closePeek());
    expect(peek().peek).toBeNull();
  });

  it('opens the full viewer at the previewed story', () => {
    const openViewer = jest.fn();
    const peek = renderPeek(openViewer);

    act(() => peek().openPeek(story, 3));
    act(() => peek().openPeekedStory());

    expect(openViewer).toHaveBeenCalledWith(3);
    expect(peek().peek).toBeNull();
  });
});
