import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import {
  isFeedMediaRetained,
  isFeedMediaLoaded,
  markFeedMediaLoaded,
  markFeedMediaRequested,
  releaseFeedMedia,
  resetFeedMediaLoadStateForTests,
  useFeedMediaLoaded,
} from '../feedMediaLoadState';

describe('feed media load state', () => {
  beforeEach(() => resetFeedMediaLoadStateForTests());

  it('retains completed media so scrolling cannot replace it with a placeholder', () => {
    expect(isFeedMediaLoaded('https://cdn.vnseea.vn/post.jpg')).toBe(false);

    markFeedMediaLoaded('https://cdn.vnseea.vn/post.jpg');

    expect(isFeedMediaLoaded('https://cdn.vnseea.vn/post.jpg')).toBe(true);
  });

  it('does not retain an in-flight request after it leaves the viewport', () => {
    const uri = 'https://cdn.vnseea.vn/in-flight.jpg';

    markFeedMediaRequested(uri);

    expect(isFeedMediaRetained(uri)).toBe(false);
    expect(isFeedMediaLoaded(uri)).toBe(false);
  });

  it('releases a failed request so a visible card can retry it', () => {
    const uri = 'https://cdn.vnseea.vn/transient.jpg';

    markFeedMediaRequested(uri);
    releaseFeedMedia(uri);

    expect(isFeedMediaRetained(uri)).toBe(false);
    expect(isFeedMediaLoaded(uri)).toBe(false);
  });

  it('ignores empty media keys', () => {
    markFeedMediaRequested('   ');
    markFeedMediaLoaded('   ');
    expect(isFeedMediaRetained('')).toBe(false);
    expect(isFeedMediaLoaded('')).toBe(false);
  });

  it('evicts the least recently loaded media from the bounded cache', () => {
    const urls = Array.from(
      { length: 65 },
      (_, index) => `https://cdn.vnseea.vn/post-${index}.jpg`,
    );

    urls.forEach(markFeedMediaLoaded);

    expect(isFeedMediaLoaded(urls[0])).toBe(false);
    expect(isFeedMediaLoaded(urls[1])).toBe(true);
    expect(isFeedMediaLoaded(urls[64])).toBe(true);
  });

  it('updates loaded subscribers after release and LRU eviction', () => {
    const observed: boolean[] = [];
    const watchedUrl = 'https://cdn.vnseea.vn/watched.jpg';

    function Probe() {
      observed.push(useFeedMediaLoaded(watchedUrl));
      return null;
    }

    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<Probe />);
    });

    act(() => markFeedMediaLoaded(watchedUrl));
    expect(observed.at(-1)).toBe(true);

    act(() => releaseFeedMedia(watchedUrl));
    expect(observed.at(-1)).toBe(false);

    act(() => {
      markFeedMediaLoaded(watchedUrl);
      Array.from({ length: 64 }, (_, index) =>
        markFeedMediaLoaded(`https://cdn.vnseea.vn/eviction-${index}.jpg`),
      );
    });
    expect(observed.at(-1)).toBe(false);

    act(() => renderer.unmount());
  });
});
