import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import type { MessageItem } from '../../../domain/types/messages.types';
import { formatMediaGroupLabel } from '../../utils/mediaGroupLabel';
import { ChatMediaStack } from '../ChatMediaStack';

jest.mock('react-native-css-interop/jsx-runtime', () =>
  jest.requireActual('react/jsx-runtime'),
);

jest.mock('react-native', () => ({
  Dimensions: { get: () => ({ width: 393, height: 852 }) },
  Image: 'Image',
  StyleSheet: {
    absoluteFill: {},
    create: (styles: unknown) => styles,
  },
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
}));

jest.mock('lucide-react-native', () => ({
  LayoutGrid: () => null,
  Play: 'PlayIcon',
  Video: () => null,
}));

jest.mock('../MessageReactions', () => ({
  MessageReactionBadge: 'MessageReactionBadge',
}));

jest.mock('../../../../shared-kernel/application/utils/videoThumbnails', () => ({
  createCachedVideoPosterThumbnail: jest.fn().mockResolvedValue(undefined),
  getCachedVideoPosterThumbnail: jest.fn(() => undefined),
}));

const emptyReactions = {
  total: 0,
  myReaction: null,
  topReactions: [],
  breakdown: {},
};

function media(id: string, overrides: Partial<MessageItem> = {}): MessageItem {
  return {
    id,
    conversationId: '2',
    fromId: '1',
    toId: '2',
    message: '',
    media: `https://media.vnseea.vn/upload/photos/${id}.jpg`,
    mediaType: 'image',
    mediaGroupId: 'media-1',
    time: 100,
    isSentByMe: true,
    seen: 0,
    reactions: emptyReactions,
    ...overrides,
  };
}

function renderStack(
  messages: MessageItem[],
  handlers: Partial<React.ComponentProps<typeof ChatMediaStack>> = {},
) {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <ChatMediaStack
        messages={messages}
        isSentByMe
        label="4 ảnh"
        onOpen={jest.fn()}
        {...handlers}
      />,
    );
  });
  return renderer;
}

describe('ChatMediaStack', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stacks at most three cards with the first picked item on top', () => {
    const renderer = renderStack([
      media('1'),
      media('2'),
      media('3'),
      media('4'),
    ]);

    const images = renderer.root.findAllByType('Image' as never);
    expect(images).toHaveLength(3);
    // Back cards render first so the first picked item paints last, on top.
    expect(images.map(image => image.props.source.uri)).toEqual([
      'https://media.vnseea.vn/upload/photos/3.jpg',
      'https://media.vnseea.vn/upload/photos/2.jpg',
      'https://media.vnseea.vn/upload/photos/1.jpg',
    ]);
    expect(renderer.root.findByType('Text' as never).props.children).toBe(
      '4 ảnh',
    );
  });

  it('opens the viewer on tap and forwards long press and double tap', () => {
    const onOpen = jest.fn();
    const onLongPress = jest.fn();
    const onDoubleTap = jest.fn();
    const renderer = renderStack([media('1'), media('2')], {
      onOpen,
      onLongPress,
      onDoubleTap,
    });
    const [labelTouchable, stackTouchable] = renderer.root.findAllByType(
      'TouchableOpacity' as never,
    );

    act(() => {
      stackTouchable!.props.onPress();
      jest.runAllTimers();
    });
    expect(onOpen).toHaveBeenCalledTimes(1);

    act(() => {
      labelTouchable!.props.onPress();
      jest.runAllTimers();
    });
    expect(onOpen).toHaveBeenCalledTimes(2);

    act(() => {
      stackTouchable!.props.onPress();
      stackTouchable!.props.onPress();
    });
    expect(onDoubleTap).toHaveBeenCalledTimes(1);

    act(() => {
      stackTouchable!.props.onLongPress();
    });
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('shows a play button only on a front video and a reaction badge for the group', () => {
    const reactions = {
      total: 1,
      myReaction: 'love' as const,
      topReactions: ['love' as const],
      breakdown: { love: 1 },
    };
    const renderer = renderStack([
      media('1', {
        mediaType: 'video',
        media: 'https://media.vnseea.vn/upload/videos/1.mp4',
        thumbnail: 'https://media.vnseea.vn/upload/photos/1-poster.jpg',
      }),
      media('2', { reactions }),
    ]);

    expect(renderer.root.findAllByType('PlayIcon' as never)).toHaveLength(1);
    const images = renderer.root.findAllByType('Image' as never);
    expect(images[images.length - 1]!.props.source.uri).toBe(
      'https://media.vnseea.vn/upload/photos/1-poster.jpg',
    );
    expect(
      renderer.root.findByType('MessageReactionBadge' as never).props.summary,
    ).toBe(reactions);
  });
});

describe('formatMediaGroupLabel', () => {
  it('counts photos and videos in both languages', () => {
    const photos = [{ mediaType: 'image' as const }, { mediaType: 'image' as const }];
    const mixed = [...photos, { mediaType: 'video' as const }];

    expect(formatMediaGroupLabel(photos, 'vi')).toBe('2 ảnh');
    expect(formatMediaGroupLabel([{ mediaType: 'video' }], 'vi')).toBe('1 video');
    expect(formatMediaGroupLabel(mixed, 'vi')).toBe('2 ảnh, 1 video');
    expect(formatMediaGroupLabel(mixed, 'en')).toBe('2 photos, 1 video');
    expect(formatMediaGroupLabel([{ mediaType: 'image' }], 'en')).toBe('1 photo');
  });
});
