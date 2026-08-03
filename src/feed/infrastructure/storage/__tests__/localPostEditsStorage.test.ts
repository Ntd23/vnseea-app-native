const mockValues = new Map<string, string>();

jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    getString: (key: string) => mockValues.get(key),
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
});
