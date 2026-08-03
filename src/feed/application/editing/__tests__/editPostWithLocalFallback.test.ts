jest.mock('../../../infrastructure/storage/localPostEditsStorage', () => ({
  localPostEditsStorage: {
    saveCaptionEdit: jest.fn(),
    removeCaptionEdit: jest.fn(),
  },
}));

jest.mock('../../events/postEditedEvents', () => ({
  postEditedEvents: { emit: jest.fn() },
}));

import { editPostWithLocalFallback } from '../editPostWithLocalFallback';
import { localPostEditsStorage } from '../../../infrastructure/storage/localPostEditsStorage';
import { postEditedEvents } from '../../events/postEditedEvents';

const mockSaveCaptionEdit = localPostEditsStorage.saveCaptionEdit as jest.Mock;
const mockRemoveCaptionEdit =
  localPostEditsStorage.removeCaptionEdit as jest.Mock;
const mockEmit = postEditedEvents.emit as jest.Mock;

describe('editPostWithLocalFallback', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('keeps the server result and clears an older local override', async () => {
    const remoteEdit = jest.fn().mockResolvedValue({ edited: true });

    await expect(
      editPostWithLocalFallback(remoteEdit, 'post-1', {
        text: 'Bản đã đồng bộ',
        privacy: 'public',
      }),
    ).resolves.toEqual({ edited: true, persistence: 'server' });

    expect(mockRemoveCaptionEdit).toHaveBeenCalledWith('post-1');
    expect(mockSaveCaptionEdit).not.toHaveBeenCalled();
  });

  it('saves and emits a local edit when the server endpoint is unavailable', async () => {
    const remoteEdit = jest.fn().mockRejectedValue(new Error('Not found'));

    await expect(
      editPostWithLocalFallback(remoteEdit, 'post-2', {
        text: 'Bản lưu tạm #vnseea',
      }),
    ).resolves.toEqual({ edited: true, persistence: 'local' });

    expect(mockSaveCaptionEdit).toHaveBeenCalledWith(
      'post-2',
      'Bản lưu tạm #vnseea',
    );
    expect(mockEmit).toHaveBeenCalledWith({
      postId: 'post-2',
      text: 'Bản lưu tạm #vnseea',
      persistence: 'local',
    });
  });
});
