const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const source = fs.readFileSync(
  path.join(
    projectRoot,
    'src/feed/presentation/components/FeedShareBottomSheet.tsx',
  ),
  'utf8',
);
const recipientHelperSource = fs.readFileSync(
  path.join(
    projectRoot,
    'src/feed/application/sharing/shareMessageRecipients.ts',
  ),
  'utf8',
);
const recipientCarouselSource = fs.readFileSync(
  path.join(
    projectRoot,
    'src/feed/presentation/components/share/FeedShareRecipientCarousel.tsx',
  ),
  'utf8',
);
const composerSource = fs.readFileSync(
  path.join(
    projectRoot,
    'src/feed/presentation/components/share/FeedShareComposerCard.tsx',
  ),
  'utf8',
);
const destinationCarouselSource = fs.readFileSync(
  path.join(
    projectRoot,
    'src/feed/presentation/components/share/FeedShareDestinationCarousel.tsx',
  ),
  'utf8',
);
const storyShareSource = fs.readFileSync(
  path.join(projectRoot, 'src/feed/application/sharing/postStoryShare.ts'),
  'utf8',
);
const feedRepositorySource = fs.readFileSync(
  path.join(
    projectRoot,
    'src/feed/infrastructure/repositories/ApiFeedRepository.ts',
  ),
  'utf8',
);

describe('FeedShareBottomSheet', () => {
  it('uses the fixed-height composer and carousel layout', () => {
    const scrollCloseIndex = source.indexOf('</ScrollView>');
    const footerIndex = source.indexOf('testID="feed-share-footer"');
    const composerIndex = source.indexOf('<FeedShareComposerCard');
    const recipientIndex = source.indexOf('<FeedShareRecipientCarousel');
    const destinationIndex = source.indexOf('<FeedShareDestinationCarousel');

    expect(source).toContain('KeyboardAvoidingView');
    expect(source).toContain("height: '84%'");
    expect(composerIndex).toBeGreaterThan(0);
    expect(recipientIndex).toBeGreaterThan(composerIndex);
    expect(destinationIndex).toBeGreaterThan(recipientIndex);
    expect(scrollCloseIndex).toBeGreaterThan(0);
    expect(footerIndex).toBeGreaterThan(scrollCloseIndex);
    expect(source).toContain('paddingBottom: Math.max(insets.bottom, 10)');
    expect(source).toContain('style={styles.scrollRegion}');
    expect(source).not.toContain('DESTINATION_ITEMS.map');
  });

  it('loads all real one-to-one and active group chats for the recipient carousel', () => {
    expect(source).toContain('createMessagesRepository');
    expect(source).toContain('includeDiscovery: false');
    expect(source).not.toContain('latestOnly: true');
    expect(source).toContain('messagesRepository.getGroupChats()');
    expect(source).toContain('getMessageShareChats');
    expect(recipientHelperSource).toContain("kind: 'user'");
    expect(recipientHelperSource).toContain("kind: 'group'");
    expect(recipientHelperSource).toContain('user:${targetId}');
    expect(recipientHelperSource).toContain('group:${targetId}');
    expect(recipientCarouselSource).toContain("status === 'sending'");
    expect(recipientCarouselSource).toContain("status === 'sent'");
    expect(recipientCarouselSource).toContain("status === 'failed'");
    expect(recipientCarouselSource).toContain("chat.chatType === 'group'");
    expect(source).not.toContain('useMessagesViewModel');
    expect(source).not.toContain('copy.messageUnavailable');
  });

  it('loads message recipients once per visibility generation without discarding valid results', () => {
    expect(source).toContain('const wasVisibleRef = useRef(false);');
    expect(source).toContain('shareVisible && !wasVisible');
    expect(source).toContain('!shareVisible && wasVisible');
    expect(source).toContain(
      '}, [backdropOpacity, shareVisible, translateY]);',
    );
    expect(source).not.toContain(
      '}, [backdropOpacity, mounted, translateY, visible]);',
    );
    expect(source).toContain('Promise.allSettled');
    expect(source).toContain('copy.chatLoadPartial');
    expect(source).toContain('feed_share_chats_load_stale');
  });

  it('sends group recipients through group_chat instead of the user endpoint', () => {
    expect(source).toContain('recipientGroupId: recipient.targetId');
    expect(source).toContain('recipientUserId: recipient.targetId');
    expect(feedRepositorySource).toContain('input.recipientGroupId');
    expect(feedRepositorySource).toContain('apiRoutes.messages.groupChat');
    expect(feedRepositorySource).toContain("type: 'send'");
    expect(feedRepositorySource).toContain('id: input.recipientGroupId');
  });

  it('distinguishes a chat loading failure from a genuinely empty list', () => {
    expect(source).toContain('messageChatsError');
    expect(source).toContain('onRetry={handleRetryMessageChats}');
    expect(recipientCarouselSource).toContain('errorLabel');
    expect(recipientCarouselSource).toContain('onRetry');
    expect(recipientCarouselSource).toContain('!isLoading && errorLabel');
  });

  it('captures a VNSEEA story card and publishes the optimistic story event', () => {
    expect(source).toContain('PostStoryShareCard');
    expect(source).toContain('captureRef(storyCardRef');
    expect(storyShareSource).toContain("format: 'jpg'");
    expect(storyShareSource).toContain('quality: 0.92');
    expect(storyShareSource).toContain('width: 1080');
    expect(storyShareSource).toContain('height: 1920');
    expect(source).toContain('createStoriesRepository');
    expect(source).toContain('storyCreatedEvents.emit');
  });

  it('does not reset story media readiness when only the share note changes', () => {
    expect(source).toContain('const storyMediaUrl = storyCardModel?.mediaUrl;');
    expect(source).toContain(
      '[shareVisible, storyCardPostId, storyMediaUrl, target]',
    );
    expect(source).not.toContain('[storyCardModel, target, visible]');
  });

  it('uses the bounded multi-recipient sender without prepending fake feed posts', () => {
    expect(source).toContain('sendPostShareToMessageRecipients');
    expect(source).toContain('MAX_MESSAGE_SHARE_RECIPIENTS');
    expect(source).toContain('MESSAGE_SHARE_CONCURRENCY');
    expect(source).toContain('const handleSendMessages');
    expect(source).toContain("destination: 'message'");
    expect(source).toContain('onPress={handleSendMessages}');
  });

  it('keeps the sheet open when copy or native sharing cannot start', () => {
    expect(source).toContain(
      "const copied = await copyToClipboard(post.id, 'post');",
    );
    expect(source).toContain('if (!copied) throw new Error(copy.copyFailed);');
    expect(source).toContain('const result = await sharePost(post, {');
    expect(source).toContain('if (!result) throw new Error(copy.shareFailed);');
  });

  it('uses supported brand utilities so primary actions remain visible', () => {
    const shareUiSource = [
      source,
      composerSource,
      recipientCarouselSource,
      destinationCarouselSource,
    ].join('\n');

    expect(shareUiSource).not.toMatch(/\b(?:bg|border)-brand\b/);
    expect(composerSource).toContain('bg-[#0000ff]');
    expect(composerSource).toContain('text-white');
    expect(source).toContain('bg-[#0000ff]');
  });
});
