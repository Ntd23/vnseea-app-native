import type { LiveStreamItem } from '../../../domain/types/live.types';
import {
  clearLiveRequestResource,
  loadLiveDiscoverySnapshot,
  loadLivePostSnapshot,
} from '../liveRequestResource';

const liveItem = {
  id: '1',
  postId: 1,
} as LiveStreamItem;

describe('liveRequestResource', () => {
  beforeEach(() => {
    clearLiveRequestResource();
  });

  it('shares discovery requests across simultaneously mounted surfaces', async () => {
    let resolveRequest!: (value: { liveStreams: LiveStreamItem[] }) => void;
    const loader = jest.fn(
      () =>
        new Promise<{ liveStreams: LiveStreamItem[] }>(resolve => {
          resolveRequest = resolve;
        }),
    );

    const first = loadLiveDiscoverySnapshot('viewer:global', loader);
    const second = loadLiveDiscoverySnapshot('viewer:global', loader);

    expect(loader).toHaveBeenCalledTimes(1);
    resolveRequest({ liveStreams: [liveItem] });
    await expect(Promise.all([first, second])).resolves.toEqual([
      { liveStreams: [liveItem] },
      { liveStreams: [liveItem] },
    ]);
  });

  it('caches active post probes but lets a forced request bypass stale data', async () => {
    const loader = jest.fn().mockResolvedValue(liveItem);

    await loadLivePostSnapshot(1, loader);
    await loadLivePostSnapshot(1, loader);
    expect(loader).toHaveBeenCalledTimes(1);

    await loadLivePostSnapshot(1, loader, { force: true });
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
