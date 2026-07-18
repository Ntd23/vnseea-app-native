import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import type { ChatItem } from '../../../../messages/domain/types/messages.types';
import type { FeedPost } from '../../../domain/types/feed.types';

const mockGetChats = jest.fn();
const mockGetGroupChats = jest.fn();
const mockRecipientCarousel = jest.fn((_props: unknown) => null);

jest.mock('react-native-css-interop/jsx-runtime', () =>
  jest.requireActual('react/jsx-runtime'),
);

jest.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicator',
  Image: 'Image',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  Platform: { OS: 'ios' },
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  StyleSheet: { create: (styles: unknown) => styles },
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
}));

jest.mock('react-native-reanimated', () => {
  const ReactActual = jest.requireActual<typeof React>('react');
  return {
    __esModule: true,
    default: { View: 'AnimatedView' },
    Easing: {
      cubic: (value: number) => value,
      in: (value: unknown) => value,
      out: (value: unknown) => value,
    },
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useSharedValue: (value: unknown) =>
      ReactActual.useRef({ value }).current,
    withTiming: (value: unknown) => value,
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn() }));

jest.mock('lucide-react-native', () => ({
  Send: () => null,
  X: () => null,
}));

jest.mock('../../../../pages', () => ({
  useMyPagesViewModel: () => ({
    pages: [],
    isLoading: false,
    error: null,
    loadFirstPage: jest.fn(async () => undefined),
  }),
}));

jest.mock('../../../../community', () => ({
  useMyGroupsViewModel: () => ({
    groups: [],
    isLoading: false,
    error: null,
    loadFirstPage: jest.fn(async () => undefined),
  }),
}));

jest.mock(
  '../../../../messages/infrastructure/repositories/ApiMessagesRepository',
  () => ({
    createMessagesRepository: () => ({
      getChats: (...args: unknown[]) => mockGetChats(...args),
      getGroupChats: (...args: unknown[]) => mockGetGroupChats(...args),
    }),
  }),
);

jest.mock('../../../../navigation/tabBarVisibility', () => ({
  tabBarVisibility: { setVisible: jest.fn() },
}));

jest.mock('../../../../stories/application/events/storyCreatedEvents', () => ({
  storyCreatedEvents: { emit: jest.fn() },
}));

jest.mock(
  '../../../../stories/infrastructure/repositories/ApiStoriesRepository',
  () => ({
    createStoriesRepository: () => ({ createStory: jest.fn() }),
  }),
);

jest.mock(
  '../../../../shared-kernel/application/hooks/useAppLanguage',
  () => ({ useAppLanguage: () => 'vi' }),
);

jest.mock(
  '../../../../shared-kernel/application/view-models/useShareViewModel',
  () => ({
    getShareableUrl: jest.fn(),
    useShareViewModel: () => ({
      copyToClipboard: jest.fn(),
      sharePost: jest.fn(),
    }),
  }),
);

jest.mock(
  '../../../../shared-kernel/application/view-models/useCurrentUserViewModel',
  () => ({
    useCurrentUserViewModel: () => ({
      user: {
        userId: 'self',
        username: 'self',
        name: 'Self',
        avatar: '',
      },
    }),
  }),
);

jest.mock(
  '../../../../shared-kernel/presentation/components/Snackbar',
  () => ({ showSnackbar: jest.fn() }),
);

jest.mock('../../../application/sharing/postStoryShare', () => ({
  buildPostStoryCardModel: jest.fn(() => null),
  createPostStoryShare: jest.fn(),
}));

jest.mock('../share/FeedShareComposerCard', () => ({
  FeedShareComposerCard: () => null,
}));

jest.mock('../share/FeedShareDestinationCarousel', () => ({
  FeedShareDestinationCarousel: () => null,
}));

jest.mock('../share/FeedShareRecipientCarousel', () => ({
  FeedShareRecipientCarousel: (props: unknown) => mockRecipientCarousel(props),
}));

jest.mock('../share/PostStoryShareCard', () => ({
  PostStoryShareCard: () => null,
}));

import { FeedShareBottomSheet } from '../FeedShareBottomSheet';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const post = {
  id: 'post-1',
  kind: 'text',
  caption: 'Post',
  permissions: { canDelete: false, canShare: true },
  publisher: { id: 'publisher-1', name: 'Publisher', username: 'publisher' },
} as FeedPost;

function renderSheet(visible: boolean) {
  return (
    <FeedShareBottomSheet
      visible={visible}
      post={post}
      onClose={jest.fn()}
      onInternalShare={jest.fn()}
    />
  );
}

function latestRecipientChats(): ChatItem[] {
  const latestCall = mockRecipientCarousel.mock.calls.at(-1);
  return (latestCall?.[0] as { chats?: ChatItem[] } | undefined)?.chats ?? [];
}

function latestRecipientProps(): {
  chats: ChatItem[];
  errorLabel?: string | null;
} {
  const latestCall = mockRecipientCarousel.mock.calls.at(-1);
  return (
    (latestCall?.[0] as {
      chats?: ChatItem[];
      errorLabel?: string | null;
    }) ?? { chats: [] }
  ) as { chats: ChatItem[]; errorLabel?: string | null };
}

function createUserChat(id: string, lastMessageTime = 100): ChatItem {
  return {
    id: `user:${id}`,
    chatId: `conversation-${id}`,
    hasConversationRecord: true,
    chatType: 'user',
    participantId: id,
    userId: id,
    username: `user-${id}`,
    name: `User ${id}`,
    avatar: '',
    lastMessage: 'Hello',
    lastMessageTime,
    unreadCount: 0,
    isOnline: false,
    isVerified: false,
  };
}

function createGroupChat(id: string, lastMessageTime = 90): ChatItem {
  return {
    id: `group:${id}`,
    chatId: id,
    chatType: 'group',
    groupId: id,
    userId: id,
    username: '',
    name: `Group ${id}`,
    avatar: '',
    lastMessage: 'Hi group',
    lastMessageTime,
    unreadCount: 0,
    isOnline: false,
    isVerified: false,
  };
}

describe('FeedShareBottomSheet message lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
  });

  it('does not mount or load data for a restricted post', async () => {
    const restrictedPost = {
      ...post,
      permissions: { canDelete: false, canShare: false },
    } as FeedPost;

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <FeedShareBottomSheet
          visible
          post={restrictedPost}
          onClose={jest.fn()}
          onInternalShare={jest.fn()}
        />,
      );
    });

    expect(renderer.toJSON()).toBeNull();
    expect(mockGetChats).not.toHaveBeenCalled();
    expect(mockGetGroupChats).not.toHaveBeenCalled();
  });

  it('keeps the first visible-generation result after mounted state rerenders', async () => {
    const userChats = createDeferred<ChatItem[]>();
    const groupChats = createDeferred<ChatItem[]>();
    mockGetChats.mockReturnValueOnce(userChats.promise);
    mockGetGroupChats.mockReturnValueOnce(groupChats.promise);

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(renderSheet(false));
    });
    await act(async () => {
      renderer.update(renderSheet(true));
    });

    expect(renderer.toJSON()).not.toBeNull();
    expect(mockGetChats).toHaveBeenCalledTimes(1);
    expect(mockGetGroupChats).toHaveBeenCalledTimes(1);

    await act(async () => {
      userChats.resolve([createUserChat('8')]);
      groupChats.resolve([createGroupChat('9')]);
      await Promise.all([userChats.promise, groupChats.promise]);
    });

    expect(latestRecipientChats().map(chat => chat.id)).toEqual([
      'user:8',
      'group:9',
    ]);

    await act(async () => renderer.unmount());
  });

  it('ignores stale results when the sheet closes and reopens quickly', async () => {
    const firstUsers = createDeferred<ChatItem[]>();
    const firstGroups = createDeferred<ChatItem[]>();
    const secondUsers = createDeferred<ChatItem[]>();
    const secondGroups = createDeferred<ChatItem[]>();
    mockGetChats
      .mockReturnValueOnce(firstUsers.promise)
      .mockReturnValueOnce(secondUsers.promise);
    mockGetGroupChats
      .mockReturnValueOnce(firstGroups.promise)
      .mockReturnValueOnce(secondGroups.promise);

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(renderSheet(false));
    });
    await act(async () => {
      renderer.update(renderSheet(true));
    });
    await act(async () => {
      renderer.update(renderSheet(false));
    });
    await act(async () => {
      renderer.update(renderSheet(true));
    });

    expect(mockGetChats).toHaveBeenCalledTimes(2);
    expect(mockGetGroupChats).toHaveBeenCalledTimes(2);

    await act(async () => {
      firstUsers.resolve([createUserChat('stale')]);
      firstGroups.resolve([createGroupChat('stale')]);
      await Promise.all([firstUsers.promise, firstGroups.promise]);
    });
    expect(latestRecipientChats()).toEqual([]);

    await act(async () => {
      secondUsers.resolve([createUserChat('fresh')]);
      secondGroups.resolve([createGroupChat('fresh')]);
      await Promise.all([secondUsers.promise, secondGroups.promise]);
    });
    expect(latestRecipientChats().map(chat => chat.id)).toEqual([
      'user:fresh',
      'group:fresh',
    ]);

    await act(async () => renderer.unmount());
  });

  it('keeps user chats visible when loading group chats fails', async () => {
    mockGetChats.mockResolvedValueOnce([createUserChat('8')]);
    mockGetGroupChats.mockRejectedValueOnce(new Error('group unavailable'));

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(renderSheet(true));
      await Promise.resolve();
    });

    expect(latestRecipientProps().chats.map(chat => chat.id)).toEqual([
      'user:8',
    ]);
    expect(latestRecipientProps().errorLabel).toBe(
      'Một phần danh sách cuộc trò chuyện chưa tải được.',
    );

    await act(async () => renderer.unmount());
  });

  it('keeps group chats visible when loading user chats fails', async () => {
    mockGetChats.mockRejectedValueOnce(new Error('user chats unavailable'));
    mockGetGroupChats.mockResolvedValueOnce([createGroupChat('9')]);

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(renderSheet(true));
      await Promise.resolve();
    });

    expect(latestRecipientProps().chats.map(chat => chat.id)).toEqual([
      'group:9',
    ]);
    expect(latestRecipientProps().errorLabel).toBe(
      'Một phần danh sách cuộc trò chuyện chưa tải được.',
    );

    await act(async () => renderer.unmount());
  });

  it('shows a full loading error when both chat sources fail', async () => {
    mockGetChats.mockRejectedValueOnce(new Error('user chats unavailable'));
    mockGetGroupChats.mockRejectedValueOnce(new Error('group unavailable'));

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(renderSheet(true));
      await Promise.resolve();
    });

    expect(latestRecipientProps().chats).toEqual([]);
    expect(latestRecipientProps().errorLabel).toBe(
      'Không tải được danh sách cuộc trò chuyện.',
    );

    await act(async () => renderer.unmount());
  });
});
