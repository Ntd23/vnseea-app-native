const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('Create Product and Poll navigation flow', () => {
  const createPostSource = read(
    'src/feed/presentation/screens/CreatePostScreen.tsx',
  );
  const createProductSource = read(
    'src/product/presentation/screens/CreateProductScreen.tsx',
  );
  const createPollSource = read(
    'src/poll/presentation/screens/CreatePollScreen.tsx',
  );

  it('preserves the owner route for embedded create-post modals', () => {
    expect(createPostSource).toContain('replaceRouteOnNavigate?: boolean');
    expect(createPostSource).toContain('if (replaceRouteOnNavigate)');
    expect(createPostSource).toContain(
      '(navigation as any).replace(targetRoute)',
    );
    expect(createPostSource).toContain('onClose();');
    expect(createPostSource).toContain(
      '(navigation as any).navigate(targetRoute)',
    );
  });

  it('replaces only the standalone create-post screen', () => {
    expect(createPostSource).toMatch(
      /<CreatePostModal[\s\S]*?visible=\{true\}[\s\S]*?replaceRouteOnNavigate[\s\S]*?\/>/,
    );
  });

  it('uses a visible brand safe area for the product form', () => {
    expect(createProductSource).toContain(
      'const PRODUCT_HEADER_COLOR = APP_BRAND_COLOR',
    );
    expect(createProductSource).toContain(
      'style={{ flex: 1, backgroundColor: PRODUCT_HEADER_COLOR }}',
    );
    expect(createProductSource).toContain(
      'barStyle="light-content" backgroundColor={PRODUCT_HEADER_COLOR}',
    );
    expect(createProductSource).toContain(
      "style={{ flex: 1, backgroundColor: '#ffffff' }}",
    );
  });

  it('uses a visible brand safe area without coloring the poll body', () => {
    expect(createPollSource).toContain('const POLL_HEADER_COLOR = APP_BRAND_COLOR');
    expect(createPollSource).toContain(
      'style={{ flex: 1, backgroundColor: POLL_HEADER_COLOR }}',
    );
    expect(createPollSource).toContain('barStyle="light-content"');
    expect(createPollSource).toContain('backgroundColor={POLL_HEADER_COLOR}');
    expect(createPollSource).toContain('className="flex-1 surface-base"');
  });

  it('protects unfinished product forms for button and gesture back', () => {
    expect(createProductSource).toContain('usePreventRemove');
    expect(createProductSource).toContain(
      'usePreventRemove(!submitSuccess, ({ data }) =>',
    );
    expect(createProductSource).toContain('navigation.dispatch(data.action)');
    expect(createPollSource).not.toContain('usePreventRemove');
  });

  it('keeps the poll title centered in a symmetric header and animates publish', () => {
    expect(createPollSource).toContain('styles.headerLeftSlot');
    expect(createPollSource).toContain('styles.headerRightSlot');
    expect(createPollSource).toContain('adjustsFontSizeToFit');
    expect(createPollSource).toContain('Animated.Text');
    expect(createPollSource).toContain('titleAnim');
    expect(createPollSource).toContain('publishScale');
    expect(createPollSource).toContain(
      'onPressIn={() => animatePublishScale(0.94)}',
    );
  });

  it('emits the created poll so Home Feed can show it immediately', () => {
    expect(createPollSource).toContain(
      "postCreatedEvents } from '../../../feed/application/events/postCreatedEvents'",
    );
    expect(createPollSource).toContain('postCreatedEvents.emit({');
    expect(createPollSource).toContain('result.post');
  });
});
