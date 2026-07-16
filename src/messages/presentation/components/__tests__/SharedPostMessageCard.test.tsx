import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import type { SharedPostPreviewModel } from '../../../application/shared-posts/sharedPostMessage';

jest.mock('react-native-css-interop/jsx-runtime', () =>
  jest.requireActual('react/jsx-runtime'),
);

jest.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicator',
  Image: 'Image',
  StyleSheet: { create: (styles: unknown) => styles },
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
}));

jest.mock('lucide-react-native', () => ({
  FileText: () => null,
  Play: () => null,
}));

jest.mock(
  '../../../../shared-kernel/application/hooks/useAppLanguage',
  () => ({ useAppLanguage: () => 'vi' }),
);

jest.mock(
  '../../../../shared-kernel/application/hooks/useAppTheme',
  () => ({ useAppTheme: () => ({ isDark: false }) }),
);

jest.mock('../../../../feed/infrastructure/repositories/ApiFeedRepository', () => ({
  createFeedRepository: () => ({ getPostById: jest.fn() }),
}));

import { SharedPostMessageCard } from '../SharedPostMessageCard';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function textContent(renderer: TestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAllByType('Text' as never)
    .flatMap(node => node.children)
    .join(' ');
}

const reference = {
  postId: '42',
  url: 'https://demo.vnseea.vn/post/42',
  note: 'Bạn xem bài này nhé',
};

describe('SharedPostMessageCard', () => {
  it('shows the note and replaces loading with the fetched preview', async () => {
    const request = deferred<SharedPostPreviewModel>();
    const loadPreview = jest.fn(() => request.promise);
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <SharedPostMessageCard
          reference={reference}
          onOpenPost={jest.fn()}
          loadPreview={loadPreview}
        />,
      );
    });

    expect(loadPreview).toHaveBeenCalledWith('42');
    expect(textContent(renderer)).toContain('Bạn xem bài này nhé');
    expect(renderer.root.findAllByType('ActivityIndicator' as never)).toHaveLength(1);

    await act(async () => {
      request.resolve({
        postId: '42',
        kind: 'video',
        publisherName: 'Nguyễn An',
        publisherAvatar: 'https://cdn.vnseea.vn/avatar.jpg',
        title: 'Video chuyến đi',
        description: 'Một ngày đáng nhớ',
        imageUrl: 'https://cdn.vnseea.vn/thumb.jpg',
        isVideo: true,
      });
      await request.promise;
    });

    const content = textContent(renderer);
    expect(content).toContain('Nguyễn An');
    expect(content).toContain('Video chuyến đi');
    expect(content).not.toContain(reference.url);
  });

  it('keeps an error preview tappable and opens the exact post id', async () => {
    const onOpenPost = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <SharedPostMessageCard
          reference={reference}
          onOpenPost={onOpenPost}
          loadPreview={() => Promise.reject(new Error('network'))}
        />,
      );
      await Promise.resolve();
    });

    expect(textContent(renderer)).toContain('Không thể tải xem trước bài viết');
    const button = renderer.root.findByProps({ accessibilityLabel: 'Mở bài viết' });
    button.props.onPress();
    expect(onOpenPost).toHaveBeenCalledWith('42');
  });
});
