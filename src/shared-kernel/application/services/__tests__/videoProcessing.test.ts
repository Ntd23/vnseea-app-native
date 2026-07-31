jest.mock('react-native-compressor', () => ({
  Video: {
    compress: jest.fn(),
    cancelCompression: jest.fn(),
  },
}));

import { prepareVideoForUpload } from '../videoProcessing';

const compressor = require('react-native-compressor').Video as {
  compress: jest.Mock;
  cancelCompression: jest.Mock;
};

const sourceVideo = {
  uri: 'file:///cache/original.mov',
  name: 'original.mov',
  type: 'video/quicktime',
  width: 2160,
  height: 3840,
  duration: 12,
};

describe('prepareVideoForUpload', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('compresses local video and normalises the upload metadata', async () => {
    compressor.compress.mockImplementationOnce(
      async (_uri, options, onProgress) => {
        options?.getCancellationId?.('compression-1');
        onProgress?.(50);
        return '/cache/vnseea-video.mp4';
      },
    );

    const progress: number[] = [];
    const result = await prepareVideoForUpload(sourceVideo, {
      onProgress: value => progress.push(value),
    });

    expect(compressor.compress).toHaveBeenCalledWith(
      sourceVideo.uri,
      expect.objectContaining({
        compressionMethod: 'auto',
        maxSize: 1080,
        minimumFileSizeForCompress: 8,
      }),
      expect.any(Function),
    );
    expect(result).toMatchObject({
      uri: expect.stringMatching(/vnseea-video\.mp4$/),
      name: 'vnseea-video.mp4',
      type: 'video/mp4',
      width: 2160,
      height: 3840,
      duration: 12,
    });
    expect(progress.at(-1)).toBe(1);
  });

  it('fails open to the original file when native compression fails', async () => {
    compressor.compress.mockRejectedValueOnce(new Error('codec unavailable'));

    await expect(prepareVideoForUpload(sourceVideo)).resolves.toEqual(
      sourceVideo,
    );
  });

  it('does not touch remote media URLs', async () => {
    const remoteVideo = {
      ...sourceVideo,
      uri: 'https://cdn.vnseea.vn/video.mp4',
    };

    await expect(prepareVideoForUpload(remoteVideo)).resolves.toEqual(
      remoteVideo,
    );
    expect(compressor.compress).not.toHaveBeenCalled();
  });
});
