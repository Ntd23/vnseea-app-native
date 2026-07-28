import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

jest.mock('../../../application/services/inlineLiveSessionCache', () => {
  class InlineLiveEndedError extends Error {
    constructor() {
      super('ended');
      this.name = 'InlineLiveEndedError';
    }
  }

  class InlineLiveUnavailableError extends Error {
    constructor(readonly reason: 'offline' | 'not-ready' = 'not-ready') {
      super('unavailable');
      this.name = 'InlineLiveUnavailableError';
    }
  }

  return {
    getInlineLiveSessionKey: (item: { postId: number; streamName: string }) =>
      `${item.postId}:${item.streamName}`,
    InlineLiveEndedError,
    InlineLiveUnavailableError,
    inlineLiveSessionCache: {
      invalidate: jest.fn(),
      load: jest.fn(),
      peek: jest.fn(),
    },
  };
});

jest.mock('../../../infrastructure/storage/endedLivePostsStorage', () => ({
  endedLivePostsStorage: {
    markEnded: jest.fn(),
    notifyInactive: jest.fn(),
  },
}));

jest.mock(
  '../../../../shared-kernel/infrastructure/storage/sessionStorage',
  () => ({
    sessionStorage: {
      getSession: () => ({ userId: 'viewer-1' }),
    },
  }),
);

import {
  InlineLiveEndedError,
  InlineLiveUnavailableError,
  inlineLiveSessionCache,
} from '../../../application/services/inlineLiveSessionCache';
import type {
  LiveSession,
  LiveStreamItem,
} from '../../../domain/types/live.types';
import { endedLivePostsStorage } from '../../../infrastructure/storage/endedLivePostsStorage';
import { useInlineLiveSession } from '../useInlineLiveSession';

const mockPeek = inlineLiveSessionCache.peek as jest.Mock;
const mockLoad = inlineLiveSessionCache.load as jest.Mock;
const mockMarkEnded = endedLivePostsStorage.markEnded as jest.Mock;
const mockNotifyInactive = endedLivePostsStorage.notifyInactive as jest.Mock;

function makeItem(postId: number): LiveStreamItem {
  return {
    id: String(postId),
    postId,
    streamName: `stream-${postId}`,
    title: 'Live',
    description: '',
    thumbnailUrl: null,
    startedAt: '2026-07-28T00:00:00.000Z',
    viewerCount: 0,
    state: 'live',
    privacy: '0',
    publisher: {
      id: 'host-1',
      name: 'Host',
      username: 'host',
      avatarUrl: '',
    },
  };
}

function makeSession(postId: number): LiveSession {
  return {
    postId,
    streamName: `stream-${postId}`,
    provider: 'livekit',
    roomName: `room-${postId}`,
    wsUrl: 'wss://live.example.test',
    token: `token-${postId}`,
    isHost: false,
    state: 'live',
  };
}

describe('useInlineLiveSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('never exposes the previous room when a recycled feed cell changes post', async () => {
    const firstItem = makeItem(101);
    const secondItem = makeItem(202);
    const firstSession = makeSession(101);
    const renderHistory: Array<{
      itemPostId: number;
      sessionPostId: number | null;
    }> = [];
    let latest!: ReturnType<typeof useInlineLiveSession>;

    mockPeek.mockImplementation((item: { postId: number }) =>
      item.postId === 101 ? firstSession : null,
    );
    mockLoad.mockImplementation(() => new Promise(() => undefined));

    function Probe({ item }: { item: LiveStreamItem }) {
      latest = useInlineLiveSession(item, true);
      renderHistory.push({
        itemPostId: item.postId,
        sessionPostId: latest.session?.postId ?? null,
      });
      return null;
    }

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Probe item={firstItem} />);
    });
    expect(latest.session?.postId).toBe(101);

    await act(async () => {
      renderer.update(<Probe item={secondItem} />);
    });

    expect(
      renderHistory.some(
        entry => entry.itemPostId === 202 && entry.sessionPostId === 101,
      ),
    ).toBe(false);
    expect(latest.session).toBeNull();

    await act(async () => renderer.unmount());
  });

  it('persists only an authoritative ended result', async () => {
    mockPeek.mockReturnValue(null);
    mockLoad.mockRejectedValue(new InlineLiveEndedError());

    function Probe() {
      useInlineLiveSession(makeItem(101), true);
      return null;
    }

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
    });

    expect(mockMarkEnded).toHaveBeenCalledWith(101, 'viewer-1');
    expect(mockNotifyInactive).not.toHaveBeenCalled();
    await act(async () => renderer.unmount());
  });

  it('removes a heartbeat-offline card without storing a permanent tombstone', async () => {
    mockPeek.mockReturnValue(null);
    mockLoad.mockRejectedValue(new InlineLiveUnavailableError('offline'));

    function Probe() {
      useInlineLiveSession(makeItem(101), true);
      return null;
    }

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
    });

    expect(mockNotifyInactive).toHaveBeenCalledWith(101, 'viewer-1');
    expect(mockMarkEnded).not.toHaveBeenCalled();
    await act(async () => renderer.unmount());
  });
});
