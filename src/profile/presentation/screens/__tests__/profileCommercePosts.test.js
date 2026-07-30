const fs = require('fs');
const path = require('path');

const read = relativePath =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('Profile commerce posts', () => {
  const profile = read('src/profile/presentation/screens/ProfileScreen.tsx');
  const feed = read('src/feed/presentation/screens/FeedScreen.tsx');
  const commerceCards = read(
    'src/feed/presentation/components/FeedCommercePostCards.tsx',
  );
  const createProduct = read(
    'src/product/presentation/screens/CreateProductScreen.tsx',
  );
  const createJob = read('src/jobs/presentation/screens/CreateJobScreen.tsx');

  it('keeps product and job posts returned by the profile feed API', () => {
    expect(profile).toContain('| FeedProductPost');
    expect(profile).toContain('| FeedJobPost');
    expect(profile).toContain("post.kind === 'product'");
    expect(profile).toContain("post.kind === 'job'");
    expect(
      profile.match(/\.filter\(isProfileFeedPost\)/g)?.length ?? 0,
    ).toBeGreaterThanOrEqual(3);
  });

  it('renders the exact commerce cards shared with Home Feed', () => {
    expect(commerceCards).toContain('export const FeedProductPostCard');
    expect(commerceCards).toContain('export const FeedJobPostCard');
    expect(feed).toContain("from '../components/FeedCommercePostCards'");
    expect(profile).toContain(
      "from '../../../feed/presentation/components/FeedCommercePostCards'",
    );
    expect(profile).toContain('<FeedProductPostCard');
    expect(profile).toContain('<FeedJobPostCard');
  });

  it('refreshes an already-mounted own profile after creating commerce content', () => {
    expect(profile).toContain('profilePostsChangedEvents.subscribe');
    expect(profile).toContain('.getPendingPosts()');
    expect(createProduct).toContain('profilePostsChangedEvents.emit();');
    expect(createJob).toContain('profilePostsChangedEvents.emit(');
  });

  it('loads commerce posts after the regular profile feed can render', () => {
    expect(profile).toContain('loadProfileCommerceForUser');
    expect(profile).toContain('.then(commercePosts =>');
    expect(profile).toContain('mergeProfileCommercePosts(current, commercePosts)');
    expect(profile).not.toContain("feedResult.status === 'rejected'");
  });

  it('keeps job posts out of reaction-only calculations', () => {
    expect(profile).toContain('function isProfileEngagementPost(');
    expect(profile).toContain("return post.kind !== 'job';");
  });
});
