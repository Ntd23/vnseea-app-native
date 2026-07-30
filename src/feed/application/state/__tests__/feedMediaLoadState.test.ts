import {
  isFeedMediaRetained,
  isFeedMediaLoaded,
  markFeedMediaLoaded,
  markFeedMediaRequested,
  resetFeedMediaLoadStateForTests,
} from '../feedMediaLoadState';

describe('feed media load state', () => {
  beforeEach(() => resetFeedMediaLoadStateForTests());

  it('retains completed media so scrolling cannot replace it with a placeholder', () => {
    expect(isFeedMediaLoaded('https://cdn.vnseea.vn/post.jpg')).toBe(false);

    markFeedMediaLoaded('https://cdn.vnseea.vn/post.jpg');

    expect(isFeedMediaLoaded('https://cdn.vnseea.vn/post.jpg')).toBe(true);
  });

  it('retains an in-flight request so recycling cannot cancel it', () => {
    const uri = 'https://cdn.vnseea.vn/in-flight.jpg';

    markFeedMediaRequested(uri);

    expect(isFeedMediaRetained(uri)).toBe(true);
    expect(isFeedMediaLoaded(uri)).toBe(false);
  });

  it('ignores empty media keys', () => {
    markFeedMediaRequested('   ');
    markFeedMediaLoaded('   ');
    expect(isFeedMediaRetained('')).toBe(false);
    expect(isFeedMediaLoaded('')).toBe(false);
  });
});
