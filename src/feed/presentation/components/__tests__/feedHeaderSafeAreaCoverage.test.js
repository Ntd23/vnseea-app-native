const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

const unsafeFeedHeaderScreens = [
  'src/community/presentation/screens/ExploreGroupsScreen.tsx',
  'src/community/presentation/screens/GroupDetailScreen.tsx',
  'src/community/presentation/screens/CreateGroupScreen.tsx',
  'src/pages/presentation/screens/PagesScreen.tsx',
  'src/pages/presentation/screens/PageDetailScreen.tsx',
  'src/pages/presentation/screens/CreatePageScreen.tsx',
  'src/events/presentation/screens/EventsScreen.tsx',
  'src/events/presentation/screens/EventDetailScreen.tsx',
  'src/events/presentation/screens/CreateEventScreen.tsx',
  'src/jobs/presentation/screens/JobsScreen.tsx',
  'src/jobs/presentation/screens/JobDetailScreen.tsx',
  'src/jobs/presentation/screens/CreateJobScreen.tsx',
  'src/blogs/presentation/screens/BlogsScreen.tsx',
  'src/blogs/presentation/screens/BlogDetailScreen.tsx',
  'src/blogs/presentation/screens/CreateBlogScreen.tsx',
  'src/blogs/presentation/screens/MyArticlesScreen.tsx',
  'src/settings/presentation/screens/AdvertisingScreen.tsx',
  'src/advertising/presentation/screens/AdDetailsScreen.tsx',
  'src/advertising/presentation/screens/CreateAdScreen.tsx',
  'src/wallet/presentation/screens/MyBalanceScreen.tsx',
  'src/movies/presentation/screens/MoviesScreen.tsx',
  'src/forum/presentation/screens/ForumScreen.tsx',
  'src/photos/presentation/screens/AlbumsScreen.tsx',
  'src/watch/presentation/screens/WatchScreen.tsx',
  'src/movies/presentation/screens/CreateMovieScreen.tsx',
  'src/movies/presentation/screens/MovieDetailScreen.tsx',
  'src/photos/presentation/screens/CreateAlbumScreen.tsx',
];

describe('FeedHeader top safe-area coverage', () => {
  it('provides top safe-area protection on every platform', () => {
    const relativePath =
      'src/feed/presentation/components/SafeAreaFeedHeader.tsx';
    const absolutePath = path.join(projectRoot, relativePath);
    const source = fs.existsSync(absolutePath) ? read(relativePath) : '';

    expect(source).not.toContain('Platform');
    expect(source).not.toContain('return <FeedHeader />');
    expect(source).toContain('<SafeAreaView');
    expect(source).toContain("edges={['top']}");
    expect(source).toContain("backgroundColor: '#FFFFFF'");
  });

  it.each(unsafeFeedHeaderScreens)(
    'uses SafeAreaFeedHeader in %s',
    relativePath => {
      const source = read(relativePath);

      expect(source).toContain(
        "import { SafeAreaFeedHeader } from '../../../feed/presentation/components/SafeAreaFeedHeader'",
      );
      expect(source).toContain('<SafeAreaFeedHeader');
      expect(source).not.toContain('<FeedHeader />');
      expect(source).not.toContain(
        "from '../../../feed/presentation/components/FeedHeader'",
      );
    },
  );

  it('adds top safe-area protection to the custom Forum header', () => {
    const source = read('src/forum/presentation/screens/ForumScreen.tsx');

    expect(source).not.toContain('Platform,');
    expect(source).toContain("from 'react-native-safe-area-context'");
    expect(source).toContain('<SafeAreaView');
    expect(source).toContain("edges={['top']}");
  });

  it('keeps the standalone points screen protected by its own top safe-area', () => {
    const source = read('src/wallet/presentation/screens/MyPointsScreen.tsx');

    expect(source).toContain('<SafeAreaView');
    expect(source).toContain("edges={['top']}");
  });

  it('does not move safe-area ownership into FeedHeader or protected screens', () => {
    const iosHeaderSource = read(
      'src/feed/presentation/components/FeedHeader.ios.tsx',
    );
    const feedSource = read('src/feed/presentation/screens/FeedScreen.tsx');
    const searchSource = read(
      'src/search/presentation/screens/SearchScreen.tsx',
    );
    const marketplaceSource = read(
      'src/product/presentation/screens/MarketplaceScreen.tsx',
    );
    const notificationsSource = read(
      'src/notifications/presentation/screens/NotificationsScreen.tsx',
    );

    expect(iosHeaderSource).not.toContain('SafeAreaView');
    expect(iosHeaderSource).not.toContain('useSafeAreaInsets');
    expect(feedSource).not.toContain('SafeAreaFeedHeader');
    expect(searchSource).not.toContain('SafeAreaFeedHeader');
    expect(marketplaceSource).not.toContain('SafeAreaFeedHeader');
    expect(notificationsSource).not.toContain('SafeAreaFeedHeader');
  });
});
