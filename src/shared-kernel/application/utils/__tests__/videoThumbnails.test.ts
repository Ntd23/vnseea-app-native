describe('video thumbnail generation on Android', () => {
  const compressorThumbnail = jest.fn();
  const legacyThumbnail = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    jest.doMock('react-native', () => ({
      NativeModules: {
        CreateThumbnail: {
          create: legacyThumbnail,
        },
      },
      Platform: {
        OS: 'android',
      },
    }));
    jest.doMock('react-native-compressor', () => ({
      createVideoThumbnail: compressorThumbnail,
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the crash-safe native thumbnail implementation', async () => {
    compressorThumbnail.mockResolvedValueOnce({
      path: 'file:///cache/video-thumb.jpg',
      mime: 'image/jpeg',
      width: 525,
      height: 295,
    });

    const { createVideoUploadThumbnail } = require('../videoThumbnails') as {
      createVideoUploadThumbnail: (uri: string) => Promise<{
        uri: string;
        type: string;
      }>;
    };

    await expect(
      createVideoUploadThumbnail('content://media/external/video/42'),
    ).resolves.toMatchObject({
      uri: 'file:///cache/video-thumb.jpg',
      type: 'image/jpeg',
    });
    expect(compressorThumbnail).toHaveBeenCalled();
    expect(legacyThumbnail).not.toHaveBeenCalled();
  });

  it('returns no thumbnail instead of calling the crash-prone module', async () => {
    compressorThumbnail.mockRejectedValue(new Error('unsupported video URI'));

    const { createVideoUploadThumbnail } = require('../videoThumbnails') as {
      createVideoUploadThumbnail: (
        uri: string,
      ) => Promise<{ uri: string } | undefined>;
    };

    await expect(
      createVideoUploadThumbnail('content://provider/broken-video'),
    ).resolves.toBeUndefined();
    expect(legacyThumbnail).not.toHaveBeenCalled();
  });
});
