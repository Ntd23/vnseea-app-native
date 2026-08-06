import type { ReelsItem, ReelsPage } from '../../../domain/types/reels.types';
import { fetchDistinctReelsBatch } from '../reelsPagination';

function createReel(id: string): ReelsItem {
  return {
    id,
    videoUrl: `https://cdn.example.com/${id}.mp4`,
    privacy: 'public',
    privacyContract: 'audience_v2',
    isAnonymous: false,
    canShare: true,
    publisher: {
      userId: `publisher-${id}`,
      username: `user-${id}`,
      name: `User ${id}`,
      isVerified: false,
    },
    likeCount: 0,
    commentCount: 0,
    viewCount: 0,
    isLiked: false,
    isSaved: false,
    myReaction: null,
  };
}

describe('fetchDistinctReelsBatch', () => {
  it('continues to the next cursor when a page only contains existing reels', async () => {
    const fetchPage = jest
      .fn<Promise<ReelsPage>, [string]>()
      .mockResolvedValueOnce({
        items: [createReel('100'), createReel('99')],
        nextCursor: '99',
      })
      .mockResolvedValueOnce({
        items: [createReel('98'), createReel('97')],
        nextCursor: '97',
      });

    const result = await fetchDistinctReelsBatch({
      cursor: '101',
      existingIds: ['100', '99'],
      fetchPage,
      targetCount: 2,
    });

    expect(result.items.map(item => item.id)).toEqual(['98', '97']);
    expect(result.nextCursor).toBe('97');
    expect(result.hasMore).toBe(true);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('combines sparse pages until it reaches the requested fresh batch size', async () => {
    const fetchPage = jest
      .fn<Promise<ReelsPage>, [string]>()
      .mockResolvedValueOnce({
        items: [createReel('50')],
        nextCursor: '50',
      })
      .mockResolvedValueOnce({
        items: [createReel('49'), createReel('48')],
        nextCursor: '48',
      });

    const result = await fetchDistinctReelsBatch({
      cursor: '51',
      existingIds: [],
      fetchPage,
      targetCount: 3,
    });

    expect(result.items.map(item => item.id)).toEqual(['50', '49', '48']);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('keeps the failed cursor retryable when loading the first page fails', async () => {
    const fetchPage = jest.fn<Promise<ReelsPage>, [string]>().mockRejectedValue(
      new Error('network unavailable'),
    );

    const result = await fetchDistinctReelsBatch({
      cursor: '40',
      existingIds: [],
      fetchPage,
    });

    expect(result.items).toEqual([]);
    expect(result.nextCursor).toBe('40');
    expect(result.hasMore).toBe(true);
    expect(result.error).toBeInstanceOf(Error);
  });

  it('stops when the server returns a repeated cursor', async () => {
    const fetchPage = jest.fn<Promise<ReelsPage>, [string]>().mockResolvedValue({
      items: [],
      nextCursor: '30',
    });

    const result = await fetchDistinctReelsBatch({
      cursor: '30',
      existingIds: [],
      fetchPage,
    });

    expect(result.items).toEqual([]);
    expect(result.nextCursor).toBe('30');
    expect(result.hasMore).toBe(false);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('requests an explicit retry when the scan limit finds no new reels', async () => {
    const fetchPage = jest
      .fn<Promise<ReelsPage>, [string]>()
      .mockResolvedValueOnce({
        items: [createReel('20')],
        nextCursor: '20',
      })
      .mockResolvedValueOnce({
        items: [createReel('19')],
        nextCursor: '19',
      });

    const result = await fetchDistinctReelsBatch({
      cursor: '21',
      existingIds: ['20', '19'],
      fetchPage,
      maxRequests: 2,
    });

    expect(result.items).toEqual([]);
    expect(result.hasMore).toBe(true);
    expect(result.shouldRetry).toBe(true);
  });
});
