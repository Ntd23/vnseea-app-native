import ReactNativeBlobUtil from 'react-native-blob-util';
import { getLocalFileSize, uploadToBunnyStream } from '../bunnyTusUpload';

// Node's Buffer is available at runtime but the app tsconfig has no Node types.
function mockBase64(value: string): string {
  const nodeBuffer = (globalThis as unknown as {
    Buffer: { from(input: string, encoding: string): { toString(encoding: string): string } };
  }).Buffer;
  return nodeBuffer.from(value, 'utf8').toString('base64');
}

jest.mock('react-native-blob-util', () => {
  const patchResponses: Array<() => unknown> = [];
  const api = {
    __patchResponses: patchResponses,
    __patchCalls: [] as Array<{ headers: Record<string, string>; body: unknown }>,
    base64: { encode: (value: string) => mockBase64(value) },
    wrap: (path: string) => `wrapped:${path}`,
    fs: {
      dirs: { CacheDir: '/cache' },
      stat: jest.fn(async () => ({ size: '25' })),
      slice: jest.fn(async (_src: string, dest: string) => dest),
      unlink: jest.fn(async () => undefined),
    },
    config: jest.fn(() => ({
      fetch: (_method: string, _url: string, headers: Record<string, string>, body: unknown) => {
        api.__patchCalls.push({ headers, body });
        const next = patchResponses.shift();
        const result = Promise.resolve().then(() => (next ? next() : undefined));
        return Object.assign(result, {
          uploadProgress: (_config: unknown, callback: (sent: number) => void) => {
            callback(5);
            return result;
          },
        });
      },
    })),
  };
  return { __esModule: true, default: api };
});

const blobUtil = ReactNativeBlobUtil as unknown as {
  __patchResponses: Array<() => unknown>;
  __patchCalls: Array<{ headers: Record<string, string>; body: unknown }>;
  fs: { stat: jest.Mock; slice: jest.Mock; unlink: jest.Mock };
};

function patchOk(offset: number) {
  return () => ({ info: () => ({ status: 204, headers: { 'upload-offset': String(offset) } }) });
}

const credentials = {
  endpoint: 'https://video.bunnycdn.com/tusupload',
  libraryId: '456',
  videoId: 'video-guid',
  expires: 1790000000,
  signature: 'sig',
};
const file = { uri: 'file:///tmp/Đi%20chơi.mov', name: 'Đi chơi.mov', type: 'video/quicktime' };

describe('uploadToBunnyStream', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    blobUtil.__patchResponses.length = 0;
    blobUtil.__patchCalls.length = 0;
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockResolvedValue({
      status: 201,
      headers: { get: (name: string) => (name === 'Location' ? '/tusupload/abc' : null) },
    });
  });

  it('creates a presigned upload and sends the file in ordered chunks', async () => {
    blobUtil.__patchResponses.push(patchOk(10), patchOk(20), patchOk(25));
    const progress: number[] = [];

    await uploadToBunnyStream(file, credentials, {
      chunkSize: 10,
      onProgress: value => progress.push(value),
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://video.bunnycdn.com/tusupload');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual(
      expect.objectContaining({
        AuthorizationSignature: 'sig',
        AuthorizationExpire: '1790000000',
        VideoId: 'video-guid',
        LibraryId: '456',
        'Tus-Resumable': '1.0.0',
        'Upload-Length': '25',
      }),
    );
    expect(init.headers['Upload-Metadata']).toBe(
      `filetype ${mockBase64('video/quicktime')},title ${mockBase64('Di choi.mov')}`,
    );
    expect(blobUtil.fs.stat).toHaveBeenCalledWith('/tmp/Đi chơi.mov');
    expect(blobUtil.fs.slice.mock.calls.map(call => [call[2], call[3]])).toEqual([
      [0, 10],
      [10, 20],
      [20, 25],
    ]);
    expect(blobUtil.__patchCalls.map(call => call.headers['Upload-Offset'])).toEqual(['0', '10', '20']);
    expect(blobUtil.__patchCalls[0]!.headers['Content-Type']).toBe('application/offset+octet-stream');
    expect(blobUtil.__patchCalls[0]!.body).toBe('wrapped:/cache/bunny-tus-video-guid-0.part');
    expect(blobUtil.fs.unlink).toHaveBeenCalledTimes(3);
    expect(progress[0]).toBe(0);
    expect(progress[progress.length - 1]).toBe(1);
  });

  it('resumes from the offset Bunny reports after a failed chunk', async () => {
    blobUtil.__patchResponses.push(
      patchOk(10),
      () => {
        throw new Error('network lost');
      },
      patchOk(25),
    );
    fetchMock
      .mockResolvedValueOnce({
        status: 201,
        headers: { get: () => 'https://video.bunnycdn.com/tusupload/abc' },
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: { get: (name: string) => (name === 'Upload-Offset' ? '15' : null) },
      });
    const wait = jest.fn(async () => undefined);

    await uploadToBunnyStream(file, credentials, { chunkSize: 10, wait });

    expect(wait).toHaveBeenCalledWith(1000);
    expect(fetchMock.mock.calls[1]![1].method).toBe('HEAD');
    expect(blobUtil.__patchCalls.map(call => call.headers['Upload-Offset'])).toEqual(['0', '10', '15']);
  });

  it('gives up after the retry budget and when the upload cannot start', async () => {
    blobUtil.__patchResponses.push(
      () => {
        throw new Error('down');
      },
      () => {
        throw new Error('still down');
      },
    );
    fetchMock
      .mockResolvedValueOnce({ status: 201, headers: { get: () => '/tusupload/abc' } })
      .mockResolvedValue({ status: 500, headers: { get: () => null } });

    await expect(
      uploadToBunnyStream(file, credentials, { chunkSize: 10, maxRetries: 1, wait: async () => undefined }),
    ).rejects.toThrow('still down');

    fetchMock.mockReset().mockResolvedValue({ status: 401, headers: { get: () => null } });
    await expect(uploadToBunnyStream(file, credentials)).rejects.toThrow('HTTP 401');
  });

  it('reads local file sizes and treats unreadable files as empty', async () => {
    await expect(getLocalFileSize('file:///tmp/a.mp4')).resolves.toBe(25);
    blobUtil.fs.stat.mockRejectedValueOnce(new Error('missing'));
    await expect(getLocalFileSize('file:///tmp/missing.mp4')).resolves.toBe(0);
  });
});
