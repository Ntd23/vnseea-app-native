import {
  createSafeUploadFileName,
  MAX_MULTIPART_FILE_NAME_LENGTH,
} from '../uploadFileName';

describe('createSafeUploadFileName', () => {
  it('keeps a normal picker filename', () => {
    expect(
      createSafeUploadFileName({
        originalName: 'IMG_1234.MOV',
        mimeType: 'video/quicktime',
        prefix: 'video',
        uniqueSuffix: '1',
      }),
    ).toBe('IMG_1234.MOV');
  });

  it('replaces a long percent-encoded iOS filename with a short media name', () => {
    const originalName = `snapvideo--${'%20caption'.repeat(40)}.mp4`;
    const result = createSafeUploadFileName({
      originalName,
      mimeType: 'video/mp4',
      prefix: 'video',
      uniqueSuffix: '1786091832',
    });

    expect(result).toBe('video-1786091832.mp4');
    expect(result.length).toBeLessThanOrEqual(
      MAX_MULTIPART_FILE_NAME_LENGTH,
    );
  });

  it('uses the MIME extension when the provider name is missing', () => {
    expect(
      createSafeUploadFileName({
        mimeType: 'image/jpeg',
        prefix: 'photo',
        uniqueSuffix: '42-0',
      }),
    ).toBe('photo-42-0.jpg');
  });

  it('removes a provider path instead of forwarding it as a multipart name', () => {
    expect(
      createSafeUploadFileName({
        originalName: '/private/var/mobile/clip.mp4',
        mimeType: 'video/mp4',
        prefix: 'video',
        uniqueSuffix: '2',
      }),
    ).toBe('clip.mp4');
  });
});
