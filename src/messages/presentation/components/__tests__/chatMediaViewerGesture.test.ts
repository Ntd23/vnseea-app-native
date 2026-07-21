import {
  getChatMediaDismissTranslation,
  shouldDismissChatMedia,
} from '../chatMediaViewerGesture';

describe('chat media viewer dismiss gesture', () => {
  it('never moves the media upward', () => {
    expect(getChatMediaDismissTranslation(-80)).toBe(0);
    expect(getChatMediaDismissTranslation(64)).toBe(64);
  });

  it('dismisses only for a deliberate downward swipe', () => {
    expect(shouldDismissChatMedia(130, 100)).toBe(true);
    expect(shouldDismissChatMedia(20, 950)).toBe(true);
    expect(shouldDismissChatMedia(-140, -1000)).toBe(false);
    expect(shouldDismissChatMedia(40, 200)).toBe(false);
  });
});
