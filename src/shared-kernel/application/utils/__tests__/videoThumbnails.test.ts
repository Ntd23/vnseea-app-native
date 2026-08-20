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

describe('feed video poster source admission', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('react-native', () => ({
      NativeModules: {},
      Platform: { OS: 'ios' },
    }));
  });

  it('only admits local media sources for on-device poster extraction', () => {
    const { canGenerateLocalVideoPoster } = require('../videoThumbnails') as {
      canGenerateLocalVideoPoster: (uri: string) => boolean;
    };

    expect(canGenerateLocalVideoPoster('file:///tmp/video.mp4')).toBe(true);
    expect(canGenerateLocalVideoPoster('content://media/video/42')).toBe(true);
    expect(canGenerateLocalVideoPoster('ph://asset-id')).toBe(true);
    expect(canGenerateLocalVideoPoster('/tmp/video.mp4')).toBe(true);
    expect(
      canGenerateLocalVideoPoster(
        'https://media.vnseea.vn/upload/videos/long-video.mp4',
      ),
    ).toBe(false);
  });

  it('does not call native thumbnail extraction for remote feed videos', async () => {
    const { createCachedVideoPosterThumbnail } = require('../videoThumbnails') as {
      createCachedVideoPosterThumbnail: (
        uri: string,
      ) => Promise<{ uri: string } | undefined>;
    };

    await expect(
      createCachedVideoPosterThumbnail(
        'https://media.vnseea.vn/upload/videos/long-video.mp4',
      ),
    ).resolves.toBeUndefined();
  });
});
