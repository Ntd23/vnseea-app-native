import { buildWatchOriginalPostUrl } from '../watchPresentation';

describe('watch presentation helpers', () => {
  it('opens the public post page instead of the media file URL', () => {
    expect(
      buildWatchOriginalPostUrl('https://v2.vnseea.vn/', '123'),
    ).toBe('https://v2.vnseea.vn/post/123');
  });
});
