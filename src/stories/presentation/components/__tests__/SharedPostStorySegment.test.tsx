import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import type { SharedPostPreviewModel } from '../../../../feed/domain/types/feed.types';

const mockLoad = jest.fn();

jest.mock('react-native-css-interop/jsx-runtime', () =>
  jest.requireActual('react/jsx-runtime'),
);

jest.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicator',
  Image: 'Image',
  Pressable: 'Pressable',
  StyleSheet: {
    absoluteFill: { position: 'absolute', inset: 0 },
    create: (styles: unknown) => styles,
  },
  Text: 'Text',
  View: 'View',
}));

jest.mock(
  '../../../../feed/application/sharing/sharedPostPreview',
  () => ({ getSharedPostPreviewPrimaryMediaUrl: () => undefined }),
);

jest.mock(
  '../../../../feed/presentation/components/SharedPostPreviewCard',
  () => ({ SharedPostPreviewCard: 'SharedPostPreviewCard' }),
);

jest.mock('../../../application/sharing/sharedPostStoryPreview', () => ({
  sharedPostStoryPreviewLoader: {
    load: (...args: unknown[]) => mockLoad(...args),
  },
}));

import { SharedPostStorySegment } from '../SharedPostStorySegment';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(resolvePromise => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function preview(postId: string): SharedPostPreviewModel {
  return {
    postId,
    publisher: {
      id: `publisher-${postId}`,
      name: `Publisher ${postId}`,
      username: `publisher-${postId}`,
    },
    privacy: 'public',
    caption: `Post ${postId}`,
    content: { kind: 'text', photos: [] },
  };
}

function segment(sourcePostId: string, onReady: () => void) {
  return (
    <SharedPostStorySegment
      sourcePostId={sourcePostId}
      availableWidth={320}
      availableHeight={560}
      onOpenPost={jest.fn()}
      onLongPress={jest.fn()}
      onPressOut={jest.fn()}
      onReady={onReady}
    />
  );
}

function measureCurrentPreview(renderer: TestRenderer.ReactTestRenderer) {
  const measurement = renderer.root.find(
    node => typeof node.props.onLayout === 'function',
  );
  measurement.props.onLayout({ nativeEvent: { layout: { height: 640 } } });
}

describe('SharedPostStorySegment readiness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
  });

  it('does not reuse the previous shared-post readiness while the next post loads', async () => {
    const first = deferred<SharedPostPreviewModel>();
    const second = deferred<SharedPostPreviewModel>();
    mockLoad.mockImplementation((postId: string) =>
      postId === '101' ? first.promise : second.promise,
    );
    const onReady = jest.fn();

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(segment('101', onReady));
    });
    await act(async () => {
      first.resolve(preview('101'));
      await first.promise;
    });
    await act(async () => {
      measureCurrentPreview(renderer);
    });
    expect(onReady).toHaveBeenCalledTimes(1);

    await act(async () => {
      renderer.update(segment('202', onReady));
    });
    expect(onReady).toHaveBeenCalledTimes(1);

    await act(async () => {
      second.resolve(preview('202'));
      await second.promise;
    });
    await act(async () => {
      measureCurrentPreview(renderer);
    });
    expect(onReady).toHaveBeenCalledTimes(2);
  });
});
