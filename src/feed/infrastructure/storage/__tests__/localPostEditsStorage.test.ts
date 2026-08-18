const mockValues = new Map<string, string>();
const mockGetString = jest.fn((key: string) => mockValues.get(key));

jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    getString: (key: string) => mockGetString(key),
    set: (key: string, value: string) => mockValues.set(key, value),
    remove: (key: string) => mockValues.delete(key),
  }),
}));

jest.mock(
  '../../../../shared-kernel/infrastructure/storage/sessionStorage',
  () => ({
    sessionStorage: {
      getSession: () => ({ userId: 'current-user' }),
    },
  }),
);

import { localPostEditsStorage } from '../localPostEditsStorage';

describe('localPostEditsStorage', () => {
  beforeEach(() => {
    mockValues.clear();
    mockGetString.mockClear();
  });

  it('persists caption edits per signed-in user', () => {
    localPostEditsStorage.saveCaptionEdit('post-1', 'Nội dung tạm');

    expect(localPostEditsStorage.getCaptionEdit('post-1')).toMatchObject({
      postId: 'post-1',
      text: 'Nội dung tạm',
    });
    expect(
      localPostEditsStorage.getCaptionEdit('post-1', 'different-user'),
    ).toBeNull();
  });

  it('removes the override after the server accepts a later edit', () => {
    localPostEditsStorage.saveCaptionEdit('post-2', 'Đang chờ');
    localPostEditsStorage.removeCaptionEdit('post-2');

    expect(localPostEditsStorage.getCaptionEdit('post-2')).toBeNull();
  });

  it('loads all caption edits in one storage read for batch application', () => {
    localPostEditsStorage.saveCaptionEdit('post-1', 'Nội dung 1');
    localPostEditsStorage.saveCaptionEdit('post-2', 'Nội dung 2');
    mockGetString.mockClear();

    expect(localPostEditsStorage.getCaptionEdits()).toMatchObject({
      'post-1': { text: 'Nội dung 1' },
      'post-2': { text: 'Nội dung 2' },
    });
    expect(mockGetString).toHaveBeenCalledTimes(1);
  });
});
