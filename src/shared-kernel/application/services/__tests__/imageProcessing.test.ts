import { NativeModules } from 'react-native';
import { prepareImageForUpload } from '../imageProcessing';

const sourceImage = {
  uri: 'file:///tmp/IMG_0001.jpg',
  name: 'IMG_0001.HEIC',
  type: 'image/jpg',
  width: 4032,
  height: 3024,
};

describe('prepareImageForUpload', () => {
  const prepare = jest.fn();
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    NativeModules.VnseeaUploadImageProcessor = { prepare };
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    delete NativeModules.VnseeaUploadImageProcessor;
    warnSpy.mockRestore();
  });

  it('downscales through the native processor and renames the upload as JPEG', async () => {
    prepare.mockResolvedValueOnce({
      uri: 'file:///tmp/vnseea-upload-images/out.jpg',
      width: 2048,
      height: 1536,
      fileName: 'out.jpg',
      type: 'image/jpeg',
      transformed: true,
    });

    await expect(prepareImageForUpload(sourceImage)).resolves.toEqual({
      uri: 'file:///tmp/vnseea-upload-images/out.jpg',
      name: 'IMG_0001.jpg',
      type: 'image/jpeg',
      width: 2048,
      height: 1536,
    });
    expect(prepare).toHaveBeenCalledWith(sourceImage.uri, {
      maxDimension: 2048,
      quality: 0.8,
      passthroughMaxBytes: 1024 * 1024,
    });
  });

  it('keeps the original file when the processor passes it through', async () => {
    prepare.mockResolvedValueOnce({
      uri: sourceImage.uri,
      width: 1080,
      height: 1350,
      fileName: 'IMG_0001.jpg',
      type: 'image/jpeg',
      transformed: false,
    });

    await expect(prepareImageForUpload(sourceImage)).resolves.toEqual({
      ...sourceImage,
      width: 1080,
      height: 1350,
    });
  });

  it('never touches animated GIFs or remote images', async () => {
    const gif = { ...sourceImage, name: 'party.gif', type: 'image/gif' };
    const remote = { ...sourceImage, uri: 'https://media.vnseea.vn/a.jpg' };

    await expect(prepareImageForUpload(gif)).resolves.toBe(gif);
    await expect(prepareImageForUpload(remote)).resolves.toBe(remote);
    expect(prepare).not.toHaveBeenCalled();
  });

  it('fails open when the native processor rejects or is not linked', async () => {
    prepare.mockRejectedValueOnce(new Error('decode failed'));
    await expect(prepareImageForUpload(sourceImage)).resolves.toBe(sourceImage);

    delete NativeModules.VnseeaUploadImageProcessor;
    await expect(prepareImageForUpload(sourceImage)).resolves.toBe(sourceImage);
  });
});
