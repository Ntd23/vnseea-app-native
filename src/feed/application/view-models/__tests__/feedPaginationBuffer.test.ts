import {
  mergeFeedPrefetchQueue,
  takeFeedPrefetchBatch,
} from '../feedPaginationBuffer';

type Item = { id: string; label?: string };

describe('feed pagination buffer', () => {
  it('keeps page order while removing visible and repeated posts', () => {
    const queue: Item[] = [{ id: '11' }, { id: '10' }];
    const incoming: Item[] = [
      { id: '10' },
      { id: '9' },
      { id: '8' },
    ];

    expect(
      mergeFeedPrefetchQueue(queue, incoming, new Set(['11'])).map(
        item => item.id,
      ),
    ).toEqual(['10', '9', '8']);
  });

  it('reveals a small batch and retains every fetched row for later', () => {
    const queued: Item[] = Array.from({ length: 9 }, (_, index) => ({
      id: String(20 - index),
    }));

    const first = takeFeedPrefetchBatch(queued, new Set(), 4);
    expect(first.batch.map(item => item.id)).toEqual(['20', '19', '18', '17']);
    expect(first.remaining.map(item => item.id)).toEqual([
      '16',
      '15',
      '14',
      '13',
      '12',
    ]);

    const second = takeFeedPrefetchBatch(
      first.remaining,
      new Set(first.batch.map(item => item.id)),
      4,
    );
    expect(second.batch.map(item => item.id)).toEqual(['16', '15', '14', '13']);
    expect(second.remaining.map(item => item.id)).toEqual(['12']);
  });

  it('drops posts that became visible while their page was in flight', () => {
    const result = takeFeedPrefetchBatch(
      [{ id: '7' }, { id: '6' }, { id: '5' }],
      new Set(['7', '5']),
      3,
    );

    expect(result.batch.map(item => item.id)).toEqual(['6']);
    expect(result.remaining).toEqual([]);
  });
});
