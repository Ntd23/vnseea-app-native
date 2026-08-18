const mockGetCaptionEdit = jest.fn();
const mockGetCaptionEdits = jest.fn();

jest.mock('../../../infrastructure/storage/localPostEditsStorage', () => ({
  localPostEditsStorage: {
    getCaptionEdit: (...args: unknown[]) => mockGetCaptionEdit(...args),
    getCaptionEdits: (...args: unknown[]) => mockGetCaptionEdits(...args),
  },
}));

import { applyLocalPostCaptionEdits } from '../postCaptionEdit';

describe('applyLocalPostCaptionEdits performance', () => {
  beforeEach(() => {
    mockGetCaptionEdit.mockReset();
    mockGetCaptionEdits.mockReset();
  });

  it('reads local edits once for an entire cached feed batch', () => {
    mockGetCaptionEdits.mockReturnValue({
      'post-2': {
        postId: 'post-2',
        text: 'Nội dung đã sửa',
        updatedAt: 1,
      },
    });
    const posts = Array.from({ length: 30 }, (_, index) => ({
      id: `post-${index + 1}`,
      caption: `Nội dung ${index + 1}`,
      mentionNames: ['old-mention'],
    }));

    const result = applyLocalPostCaptionEdits(posts, 'user-1');

    expect(mockGetCaptionEdits).toHaveBeenCalledTimes(1);
    expect(mockGetCaptionEdits).toHaveBeenCalledWith('user-1');
    expect(mockGetCaptionEdit).not.toHaveBeenCalled();
    expect(result[1]).toMatchObject({
      caption: 'Nội dung đã sửa',
      mentionNames: undefined,
    });
  });
});
