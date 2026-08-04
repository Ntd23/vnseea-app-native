const fs = require('fs');
const path = require('path');

const read = relativePath =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('PageDetail post sharing', () => {
  it('uses the same Feed share sheet as Feed and PostDetail', () => {
    const source = read('src/pages/presentation/screens/PageDetailScreen.tsx');

    expect(source).toContain(
      "import { FeedShareBottomSheet } from '../../../feed/presentation/components/FeedShareBottomSheet';",
    );
    expect(source).toContain('<FeedShareBottomSheet');
    expect(source).toContain('page={vm.page}');
    expect(source).toContain('onInternalPageShare={handleInternalSharePage}');
    expect(source).not.toContain('PageShareActionSheet');
    expect(source).toContain('onInternalShare={handleInternalSharePost}');
    expect(source).toContain('onShared={handlePostShared}');
    expect(source).not.toContain(
      "import { ShareActionSheet } from '../../../shared-kernel/presentation/components/ShareActionSheet';",
    );
  });

  it('opens the Feed share sheet from the Page hero share button', () => {
    const source = read('src/pages/presentation/screens/PageDetailScreen.tsx');

    expect(source).toContain('onPress={onShare}');
    expect(source).toContain('onShare={handleShare}');
    expect(source).toContain('setShareSheetVisible(true)');
    expect(source).toContain('visible={shareSheetVisible}');
    expect(source).toContain('page={vm.page}');
    expect(source).toContain('onInternalPageShare={handleInternalSharePage}');
    expect(source).not.toContain('PageShareActionSheet');
  });
});
