import {
  getFeedVideoActiveUpdate,
  pickFeedVideoAutoplayCandidate,
} from '../feedVideoAutoplay';

describe('feed video autoplay selection', () => {
  it('returns null when no video is at least half visible', () => {
    expect(
      pickFeedVideoAutoplayCandidate({
        viewportHeight: 800,
        candidates: [
          { id: 'video-a', y: -360, height: 600 },
          { id: 'video-b', y: 620, height: 600 },
        ],
      }),
    ).toBeNull();
  });

  it('selects a single video that is at least half visible', () => {
    expect(
      pickFeedVideoAutoplayCandidate({
        viewportHeight: 800,
        candidates: [{ id: 'video-a', y: 180, height: 500 }],
      }),
    ).toBe('video-a');
  });

  it('selects the eligible visible video closest to viewport center', () => {
    expect(
      pickFeedVideoAutoplayCandidate({
        viewportHeight: 900,
        candidates: [
          { id: 'video-top', y: 0, height: 500 },
          { id: 'video-center', y: 250, height: 500 },
        ],
      }),
    ).toBe('video-center');
  });

  it('keeps the active video playing while any part remains visible during scrolling', () => {
    expect(
      getFeedVideoActiveUpdate({
        activeVideoId: 'video-a',
        isScrolling: true,
        viewableItems: [
          {
            isViewable: true,
            item: { type: 'post', post: { kind: 'video', id: 'video-b' } },
          },
        ],
        visibleItems: [
          {
            isViewable: true,
            item: { type: 'post', post: { kind: 'video', id: 'video-a' } },
          },
          {
            isViewable: true,
            item: { type: 'post', post: { kind: 'video', id: 'video-b' } },
          },
        ],
      }),
    ).toEqual({
      nextActiveVideoId: undefined,
      pendingActiveVideoId: 'video-b',
    });
  });

  it('clears the active video only after the active card fully leaves view', () => {
    expect(
      getFeedVideoActiveUpdate({
        activeVideoId: 'video-a',
        isScrolling: true,
        viewableItems: [
          {
            isViewable: true,
            item: { type: 'post', post: { kind: 'video', id: 'video-b' } },
          },
        ],
        visibleItems: [
          {
            isViewable: true,
            item: { type: 'post', post: { kind: 'video', id: 'video-b' } },
          },
        ],
      }),
    ).toEqual({
      nextActiveVideoId: null,
      pendingActiveVideoId: 'video-b',
    });
  });

  it('retains a partially visible active video after scrolling settles', () => {
    expect(
      getFeedVideoActiveUpdate({
        activeVideoId: 'video-a',
        isScrolling: false,
        viewableItems: [],
        visibleItems: [
          {
            isViewable: true,
            item: { type: 'post', post: { kind: 'video', id: 'video-a' } },
          },
        ],
      }),
    ).toEqual({
      nextActiveVideoId: undefined,
      pendingActiveVideoId: null,
    });
  });

  it('activates a newly visible video when feed scrolling is settled', () => {
    expect(
      getFeedVideoActiveUpdate({
        activeVideoId: null,
        isScrolling: false,
        viewableItems: [
          {
            isViewable: true,
            item: { type: 'post', post: { kind: 'video', id: 'video-c' } },
          },
        ],
      }),
    ).toEqual({
      nextActiveVideoId: 'video-c',
      pendingActiveVideoId: null,
    });
  });
});
