const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../PageDetailScreen.tsx'),
  'utf8',
);

describe('PageDetailScreen modern mobile layout', () => {
  it('keeps page navigation controls visible on the cover', () => {
    expect(source).toContain('accessibilityLabel={copy.backBtn');
    expect(source).toContain('onPress={onBack}');
    expect(source).toContain('accessibilityLabel={copy.moreBtn');
    expect(source).toContain('onPress={onMore}');
  });

  it('uses a flat feed-style page summary with key metrics', () => {
    expect(source).toContain(
      'overflow-visible border-y border-[#dddfe2] bg-white px-4 pb-5',
    );
    expect(source).not.toContain('rounded-[28px]');
    expect(source).toContain('label={copy.likesLabel}');
    expect(source).toContain('label={copy.followersLabel}');
    expect(source).toContain('label={copy.postsLabel}');
  });

  it('matches the profile cover and avatar geometry', () => {
    expect(source).toContain('aspectRatio: PROFILE_COVER_ASPECT_RATIO');
    expect(source).toContain('<PageAvatar page={page} size={100} />');
    expect(source).toContain('-mt-[50px] flex-row items-start');
    expect(source).toContain('pt-[57px]');
    expect(source).toContain('h-[30px] w-[30px]');
    expect(source).toContain('style={{ zIndex: 10, elevation: 2 }}');
  });

  it('provides large owner actions without the old vertical action stack', () => {
    expect(source).toContain('function HeroActionButton');
    expect(source).toContain('min-h-12 flex-row items-center justify-center');
    expect(source).not.toContain('className="mt-4 items-center gap-2"');
  });

  it('adds post search clearing, post counts, and all/photo filters', () => {
    expect(source).toContain('accessibilityLabel={clearLabel}');
    expect(source).toContain("onChangeTab('all')");
    expect(source).toContain("onChangeTab('photos')");
    expect(source).toContain('photoCount={vm.postCounts.photos}');
  });
});
