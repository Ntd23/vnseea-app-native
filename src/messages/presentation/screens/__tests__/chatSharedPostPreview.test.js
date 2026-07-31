const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('ChatScreen shared post preview', () => {
  it('renders shared posts and opens the matching detail screen', () => {
    const source = read('src/messages/presentation/screens/ChatScreen.tsx');

    expect(source).toContain('SharedPostMessageCard');
    expect(source).toContain("return 'shared-post'");
    expect(source).toContain(
      'keyExtractor={item => `${getChatListItemType(item)}:${item.id}`}',
    );
    expect(source).toContain('message.sharedPost');
    expect(source).toContain('ROUTES.POST_DETAIL');
    expect(source).toContain('ROUTES.PRODUCT_DETAIL');
    expect(source).toContain("target.kind === 'product'");
    expect(source).toContain('productId: target.productId');
    expect(source).toContain('ROUTES.JOB_DETAIL');
    expect(source).toContain("target.kind === 'job'");
    expect(source).toContain('jobId: target.jobId');
    expect(source).toContain('job: target.job');
    expect(source).toContain('postId');
    expect(source).toContain('onOpenSharedPost');
  });

  it('adds a shared-post reference to optimistic messages', () => {
    const source = read(
      'src/messages/application/view-models/useChatViewModel.ts',
    );

    expect(source).toContain('describeMessageTextContent');
    expect(source).toContain(
      'sharedPost: textDescriptor.sharedPost',
    );
  });

  it('keeps the message-share backend payload text-only', () => {
    const source = read(
      'src/feed/infrastructure/repositories/ApiFeedRepository.ts',
    );
    const messageShare = source.slice(
      source.indexOf("if (input.destination === 'message')"),
      source.indexOf('// We don\'t have a fresh FeedPost'),
    );

    expect(messageShare).toContain('text: messageBody');
    expect(messageShare).not.toContain('post_id:');
    expect(messageShare).not.toContain('message_type:');
  });
});
